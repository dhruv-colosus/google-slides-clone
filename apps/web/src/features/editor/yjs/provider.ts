/**
 * DocProvider — the seam between Y.Doc and the rest of the editor.
 *
 * Every structural mutation flows through here so that:
 *   - it runs inside a tracked transaction (single undo step per user action)
 *   - external listeners (the React store) get a single notification per action
 *   - swapping in IndexedDB / WebSocket providers (Phase 8/10) changes only
 *     the class implementation, not the call sites.
 */

import * as Y from "yjs";
import { ySyncPluginKey, yXmlFragmentToProsemirrorJSON } from "y-prosemirror";
import type {
  BaseElement,
  Comment,
  CommentId,
  Deck,
  ElementId,
  ImageCrop,
  ShapeKind,
  Slide,
  SlideBackground,
  SlideElement,
  SlideId,
  TextBlock,
} from "../model/types";
import {
  commentToYMap,
  elementToYMap,
  findCommentIndex,
  findCommentYMap,
  findElementYMap,
  findSlideIndex,
  findSlideYMap,
  hydrateDoc,
  populateTextFragmentFromJson,
  readDeck,
  sanitizeTextBlock,
  slideToYMap,
  type YComment,
  type YElement,
  type YSlide,
} from "./schema";

export const LOCAL_ORIGIN = "local";
export const COMMENTS_ORIGIN = "comments";

/**
 * Earlier versions persisted creation-time defaults as literal hex strings
 * (e.g. "#202124"), which blocked theme swaps from reaching them. New code
 * uses theme tokens ("theme.title"). This upgrades legacy defaults so theme
 * changes cascade through already-saved decks.
 */
const LEGACY_DEFAULT_TEXT_COLORS: Record<string, string> = {
  "#202124": "theme.title",
  "#3c4043": "theme.body",
  "#5f6368": "theme.muted",
};
const LEGACY_DEFAULT_FONT_FAMILIES: Record<string, string> = {
  Arial: "theme.body",
};
const LEGACY_DEFAULT_SHAPE_FILLS: Record<string, string> = {
  "#e8eaed": "theme.accentSoft",
  "#a8c7fa": "theme.accentSoft",
};
const LEGACY_DEFAULT_SHAPE_STROKES: Record<string, string> = {
  "#202124": "theme.title",
  "#3c4043": "theme.body",
  "#5f6368": "theme.muted",
};

function normalizeLegacyDefaults(deck: Deck): Deck {
  const slides = deck.slides.map((slide) => {
    const elements = slide.elements.map((el) => {
      if (el.type === "text") {
        const text = el.text;
        const nextColor = text.color && LEGACY_DEFAULT_TEXT_COLORS[text.color];
        const nextFont =
          text.fontFamily && LEGACY_DEFAULT_FONT_FAMILIES[text.fontFamily];
        if (!nextColor && !nextFont) return el;
        return {
          ...el,
          text: {
            ...text,
            ...(nextColor ? { color: nextColor } : null),
            ...(nextFont ? { fontFamily: nextFont } : null),
          },
        };
      }
      if (el.type === "shape") {
        const nextFill = el.fill && LEGACY_DEFAULT_SHAPE_FILLS[el.fill];
        const nextStroke = el.stroke && LEGACY_DEFAULT_SHAPE_STROKES[el.stroke];
        if (!nextFill && !nextStroke) return el;
        return {
          ...el,
          ...(nextFill ? { fill: nextFill } : null),
          ...(nextStroke ? { stroke: nextStroke } : null),
        };
      }
      return el;
    });
    return { ...slide, elements };
  });
  return { ...deck, slides };
}

export type ElementPatch = Partial<BaseElement> & {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
  text?: TextBlock;
  shape?: ShapeKind;
  src?: string;
  alt?: string;
  crop?: ImageCrop;
};

export type ZDirection = "forward" | "backward" | "front" | "back";

export interface DocProvider {
  readonly doc: Y.Doc;
  readonly undoManager: Y.UndoManager;

  subscribe(fn: () => void): () => void;
  getVersion(): number;
  readDeck(): Deck;

  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;

  renameDeck(title: string): void;
  setDeckTheme(themeId: string): void;
  addSlide(afterSlideId?: SlideId | null): SlideId;
  insertSlides(slides: Slide[], afterSlideId?: SlideId | null): SlideId[];
  deleteSlide(slideId: SlideId): void;
  duplicateSlide(slideId: SlideId): SlideId | null;
  reorderSlides(fromIndex: number, toIndex: number): void;

  setSlideBackground(slideId: SlideId, bg: SlideBackground): void;
  applyLayout(
    slideId: SlideId,
    layoutId: string,
    elements: SlideElement[],
  ): void;

  addElement(slideId: SlideId, el: SlideElement): void;
  updateElement(slideId: SlideId, elementId: ElementId, patch: ElementPatch): void;
  updateElements(
    slideId: SlideId,
    updates: Array<{ id: ElementId; patch: ElementPatch }>,
  ): void;
  deleteElement(slideId: SlideId, elementId: ElementId): void;
  duplicateElement(slideId: SlideId, elementId: ElementId): ElementId | null;
  setElementZ(slideId: SlideId, elementId: ElementId, direction: ZDirection): void;

  getTextFragment(slideId: SlideId, elementId: ElementId): Y.XmlFragment | null;

  addComment(input: {
    slideId: SlideId;
    authorId: string;
    authorName: string;
    authorPicture: string | null;
    text: string;
  }): CommentId;
  updateCommentText(commentId: CommentId, text: string): void;
  deleteComment(commentId: CommentId): void;
  resolveComment(commentId: CommentId, byName: string): void;
  unresolveComment(commentId: CommentId): void;

  destroy(): void;
}

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function blankSlide(): Slide {
  return {
    id: newId("slide"),
    layoutId: "blank",
    background: { kind: "theme" },
    elements: [],
  };
}

function cloneElementData(el: SlideElement): SlideElement {
  return JSON.parse(JSON.stringify(el));
}

function isEmptyPlaceholderYElement(yEl: YElement): boolean {
  if (yEl.get("type") !== "text") return false;
  const text = yEl.get("text") as TextBlock | undefined;
  if (!text?.placeholder) return false;
  const frag = yEl.get("doc");
  if (!(frag instanceof Y.XmlFragment)) return true;
  if (frag.length === 0) return true;
  try {
    const json = yXmlFragmentToProsemirrorJSON(frag);
    return extractPmText(json).trim().length === 0;
  } catch {
    return true;
  }
}

function extractPmText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as { text?: unknown; content?: unknown };
  if (typeof n.text === "string") return n.text;
  if (Array.isArray(n.content)) {
    let out = "";
    for (const child of n.content) out += extractPmText(child);
    return out;
  }
  return "";
}

function applyElementPatch(el: YElement, patch: ElementPatch) {
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (key === "text" && value && typeof value === "object") {
      el.set(key, sanitizeTextBlock(value as TextBlock));
      continue;
    }
    el.set(key, value);
  }
}

export class InMemoryDocProvider implements DocProvider {
  readonly doc: Y.Doc;
  readonly undoManager: Y.UndoManager;

  private listeners = new Set<() => void>();
  private version = 0;
  private cachedDeck: Deck | null = null;
  private cachedVersion = -1;

  constructor(initialDeck: Deck) {
    this.doc = new Y.Doc();
    hydrateDoc(this.doc, normalizeLegacyDefaults(initialDeck));

    const meta = this.doc.getMap("meta");
    const slides = this.doc.getArray("slides");
    this.undoManager = new Y.UndoManager([meta, slides], {
      trackedOrigins: new Set([LOCAL_ORIGIN, ySyncPluginKey]),
      captureTimeout: 400,
    });

    this.doc.on("update", this.handleUpdate);
    this.undoManager.on("stack-item-added", this.handleStackChange);
    this.undoManager.on("stack-item-popped", this.handleStackChange);
  }

  private handleUpdate = () => {
    this.version++;
    this.cachedVersion = -1;
    this.listeners.forEach((fn) => fn());
  };

  private handleStackChange = () => {
    this.version++;
    this.cachedVersion = -1;
    this.listeners.forEach((fn) => fn());
  };

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  getVersion = () => this.version;

  readDeck = (): Deck => {
    if (this.cachedVersion !== this.version || !this.cachedDeck) {
      this.cachedDeck = readDeck(this.doc);
      this.cachedVersion = this.version;
    }
    return this.cachedDeck;
  };

  undo = () => {
    this.undoManager.stopCapturing();
    this.undoManager.undo();
  };

  redo = () => {
    this.undoManager.stopCapturing();
    this.undoManager.redo();
  };

  canUndo = () => this.undoManager.canUndo();
  canRedo = () => this.undoManager.canRedo();

  private transact(fn: () => void) {
    this.doc.transact(fn, LOCAL_ORIGIN);
  }

  renameDeck = (title: string) => {
    this.transact(() => {
      this.doc.getMap("meta").set("title", title);
    });
  };

  setDeckTheme = (themeId: string) => {
    this.transact(() => {
      this.doc.getMap("meta").set("themeId", themeId);
    });
  };

  setSlideBackground = (slideId: SlideId, bg: SlideBackground) => {
    const slide = findSlideYMap(this.doc, slideId);
    if (!slide) return;
    this.transact(() => {
      slide.set("background", { ...bg });
    });
  };

  applyLayout = (
    slideId: SlideId,
    layoutId: string,
    elements: SlideElement[],
  ) => {
    const slide = findSlideYMap(this.doc, slideId);
    if (!slide) return;
    const els = slide.get("elements") as Y.Array<YElement>;
    this.transact(() => {
      slide.set("layoutId", layoutId);

      // Smart merge: drop empty (never-edited) placeholders, keep user content.
      for (let i = els.length - 1; i >= 0; i--) {
        if (isEmptyPlaceholderYElement(els.get(i))) els.delete(i, 1);
      }

      // Bump kept user elements above the new layout's placeholders so user
      // content stays visible on top after the layout change.
      const maxNewZ = elements.reduce((m, e) => Math.max(m, e.z), 0);
      if (maxNewZ > 0) {
        for (let i = 0; i < els.length; i++) {
          const kept = els.get(i);
          const curZ = (kept.get("z") as number) ?? 0;
          kept.set("z", curZ + maxNewZ);
        }
      }

      if (elements.length) els.insert(els.length, elements.map(elementToYMap));
    });
  };

  addSlide = (afterSlideId?: SlideId | null): SlideId => {
    const slides = this.doc.getArray<YSlide>("slides");
    const fresh = blankSlide();
    const ym = slideToYMap(fresh);
    this.transact(() => {
      let insertAt = slides.length;
      if (afterSlideId) {
        const idx = findSlideIndex(this.doc, afterSlideId);
        if (idx !== -1) insertAt = idx + 1;
      }
      slides.insert(insertAt, [ym]);
    });
    return fresh.id;
  };

  insertSlides = (
    incoming: Slide[],
    afterSlideId?: SlideId | null,
  ): SlideId[] => {
    if (!incoming.length) return [];
    const slides = this.doc.getArray<YSlide>("slides");
    // Generate fresh ids so imported content can't collide with existing ids.
    const renamed: Slide[] = incoming.map((s) => ({
      ...s,
      id: newId("slide"),
      elements: s.elements.map((e) => ({ ...e, id: newId("el") })),
    }));
    const newIds = renamed.map((s) => s.id);

    this.transact(() => {
      let insertAt = slides.length;
      if (afterSlideId) {
        const idx = findSlideIndex(this.doc, afterSlideId);
        if (idx !== -1) insertAt = idx + 1;
      }
      // Pass 1: build and attach slide Y.Maps.
      const yMaps = renamed.map(slideToYMap);
      slides.insert(insertAt, yMaps);
      // Pass 2: populate text Y.XmlFragments now that each Y.Map is attached
      // to the doc (same two-pass as hydrateDoc — attaching a populated
      // fragment to a detached map loses the content).
      for (let i = 0; i < renamed.length; i++) {
        const source = renamed[i];
        const ySlide = slides.get(insertAt + i);
        const yEls = ySlide.get("elements") as Y.Array<YElement>;
        for (let j = 0; j < source.elements.length; j++) {
          const el = source.elements[j];
          if (el.type !== "text") continue;
          const content = el.text.contentJson;
          if (!content) continue;
          populateTextFragmentFromJson(yEls.get(j), content);
        }
      }
    });

    return newIds;
  };

  deleteSlide = (slideId: SlideId) => {
    const slides = this.doc.getArray<YSlide>("slides");
    if (slides.length <= 1) return;
    const idx = findSlideIndex(this.doc, slideId);
    if (idx === -1) return;
    this.transact(() => {
      slides.delete(idx, 1);
    });
  };

  duplicateSlide = (slideId: SlideId): SlideId | null => {
    const idx = findSlideIndex(this.doc, slideId);
    if (idx === -1) return null;
    const slides = this.doc.getArray<YSlide>("slides");
    const source = slides.get(idx);
    // Y.Map.clone() deep-copies nested Y types (including element Y.Maps and
    // their Y.XmlFragment "doc" children), so typed text content is preserved.
    const cloned = source.clone() as YSlide;
    const newSlideId = newId("slide");
    this.transact(() => {
      slides.insert(idx + 1, [cloned]);
      cloned.set("id", newSlideId);
      const clonedEls = cloned.get("elements") as Y.Array<YElement>;
      for (let i = 0; i < clonedEls.length; i++) {
        clonedEls.get(i).set("id", newId("el"));
      }
    });
    return newSlideId;
  };

  reorderSlides = (fromIndex: number, toIndex: number) => {
    const slides = this.doc.getArray<YSlide>("slides");
    const len = slides.length;
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= len ||
      toIndex >= len
    ) {
      return;
    }
    // A Y type can only have one parent, so we cannot literally move the same
    // Y.Map between positions. Cloning preserves all nested Y state (notably
    // the Y.XmlFragment text body) while letting us reinsert at a new index.
    const source = slides.get(fromIndex);
    const cloned = source.clone() as YSlide;
    this.transact(() => {
      slides.delete(fromIndex, 1);
      slides.insert(toIndex, [cloned]);
    });
  };

  addElement = (slideId: SlideId, el: SlideElement) => {
    const slide = findSlideYMap(this.doc, slideId);
    if (!slide) return;
    const els = slide.get("elements") as Y.Array<YElement>;
    this.transact(() => {
      const yEl = elementToYMap(el);
      els.push([yEl]);
      if (el.type === "text" && el.text.contentJson) {
        populateTextFragmentFromJson(yEl, el.text.contentJson);
      }
    });
  };

  updateElement = (slideId: SlideId, elementId: ElementId, patch: ElementPatch) => {
    const slide = findSlideYMap(this.doc, slideId);
    if (!slide) return;
    const found = findElementYMap(slide, elementId);
    if (!found) return;
    this.transact(() => {
      applyElementPatch(found.el, patch);
    });
  };

  updateElements = (
    slideId: SlideId,
    updates: Array<{ id: ElementId; patch: ElementPatch }>,
  ) => {
    const slide = findSlideYMap(this.doc, slideId);
    if (!slide) return;
    this.transact(() => {
      for (const { id, patch } of updates) {
        const found = findElementYMap(slide, id);
        if (found) applyElementPatch(found.el, patch);
      }
    });
  };

  deleteElement = (slideId: SlideId, elementId: ElementId) => {
    const slide = findSlideYMap(this.doc, slideId);
    if (!slide) return;
    const found = findElementYMap(slide, elementId);
    if (!found) return;
    const els = slide.get("elements") as Y.Array<YElement>;
    this.transact(() => {
      els.delete(found.index, 1);
    });
  };

  duplicateElement = (slideId: SlideId, elementId: ElementId): ElementId | null => {
    const slide = findSlideYMap(this.doc, slideId);
    if (!slide) return null;
    const found = findElementYMap(slide, elementId);
    if (!found) return null;
    const deck = this.readDeck();
    const s = deck.slides.find((sl) => sl.id === slideId);
    const source = s?.elements.find((e) => e.id === elementId);
    if (!source) return null;
    const copy: SlideElement = {
      ...cloneElementData(source),
      id: newId("el"),
      x: source.x + 20,
      y: source.y + 20,
      z: source.z + 1,
    };
    const els = slide.get("elements") as Y.Array<YElement>;
    this.transact(() => {
      const yEl = elementToYMap(copy);
      els.push([yEl]);
      if (copy.type === "text" && copy.text.contentJson) {
        populateTextFragmentFromJson(yEl, copy.text.contentJson);
      }
    });
    return copy.id;
  };

  getTextFragment = (slideId: SlideId, elementId: ElementId): Y.XmlFragment | null => {
    const slide = findSlideYMap(this.doc, slideId);
    if (!slide) return null;
    const found = findElementYMap(slide, elementId);
    if (!found) return null;
    const fragment = found.el.get("doc");
    return fragment instanceof Y.XmlFragment ? fragment : null;
  };

  setElementZ = (slideId: SlideId, elementId: ElementId, direction: ZDirection) => {
    const slide = findSlideYMap(this.doc, slideId);
    if (!slide) return;
    const els = slide.get("elements") as Y.Array<YElement>;
    const zs: Array<{ el: YElement; z: number }> = [];
    for (let i = 0; i < els.length; i++) {
      const e = els.get(i);
      zs.push({ el: e, z: (e.get("z") as number) ?? 0 });
    }
    const target = zs.find((z) => z.el.get("id") === elementId);
    if (!target) return;
    const maxZ = Math.max(...zs.map((z) => z.z));
    const minZ = Math.min(...zs.map((z) => z.z));
    this.transact(() => {
      if (direction === "front") {
        target.el.set("z", maxZ + 1);
      } else if (direction === "back") {
        target.el.set("z", minZ - 1);
      } else if (direction === "forward") {
        const higher = zs.filter((z) => z.z > target.z).sort((a, b) => a.z - b.z)[0];
        if (higher) {
          target.el.set("z", higher.z);
          higher.el.set("z", target.z);
        }
      } else {
        const lower = zs.filter((z) => z.z < target.z).sort((a, b) => b.z - a.z)[0];
        if (lower) {
          target.el.set("z", lower.z);
          lower.el.set("z", target.z);
        }
      }
    });
  };

  private commentsTransact(fn: () => void) {
    // Comments bypass the UndoManager — undo should not unpost a comment.
    this.doc.transact(fn, COMMENTS_ORIGIN);
  }

  addComment = (input: {
    slideId: SlideId;
    authorId: string;
    authorName: string;
    authorPicture: string | null;
    text: string;
  }): CommentId => {
    const id = newId("cmt");
    const comment: Comment = {
      id,
      slideId: input.slideId,
      authorId: input.authorId,
      authorName: input.authorName,
      authorPicture: input.authorPicture,
      text: input.text,
      createdAt: Date.now(),
      updatedAt: null,
      resolvedAt: null,
      resolvedByName: null,
    };
    const arr = this.doc.getArray<YComment>("comments");
    this.commentsTransact(() => {
      arr.push([commentToYMap(comment)]);
    });
    return id;
  };

  updateCommentText = (commentId: CommentId, text: string) => {
    const c = findCommentYMap(this.doc, commentId);
    if (!c) return;
    this.commentsTransact(() => {
      c.set("text", text);
      c.set("updatedAt", Date.now());
    });
  };

  deleteComment = (commentId: CommentId) => {
    const idx = findCommentIndex(this.doc, commentId);
    if (idx === -1) return;
    const arr = this.doc.getArray<YComment>("comments");
    this.commentsTransact(() => {
      arr.delete(idx, 1);
    });
  };

  resolveComment = (commentId: CommentId, byName: string) => {
    const c = findCommentYMap(this.doc, commentId);
    if (!c) return;
    this.commentsTransact(() => {
      c.set("resolvedAt", Date.now());
      c.set("resolvedByName", byName);
    });
  };

  unresolveComment = (commentId: CommentId) => {
    const c = findCommentYMap(this.doc, commentId);
    if (!c) return;
    this.commentsTransact(() => {
      c.set("resolvedAt", null);
      c.set("resolvedByName", null);
    });
  };

  destroy = () => {
    this.doc.off("update", this.handleUpdate);
    this.undoManager.off("stack-item-added", this.handleStackChange);
    this.undoManager.off("stack-item-popped", this.handleStackChange);
    this.undoManager.destroy();
    this.doc.destroy();
    this.listeners.clear();
  };
}

export function newElementId() {
  return newId("el");
}
