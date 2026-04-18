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
import { ySyncPluginKey } from "y-prosemirror";
import type {
  BaseElement,
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
  elementToYMap,
  findElementYMap,
  findSlideIndex,
  findSlideYMap,
  hydrateDoc,
  readDeck,
  sanitizeTextBlock,
  slideToYMap,
  type YElement,
  type YSlide,
} from "./schema";

export const LOCAL_ORIGIN = "local";

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
    hydrateDoc(this.doc, initialDeck);

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
    this.undoManager.undo();
  };

  redo = () => {
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
      if (els.length) els.delete(0, els.length);
      if (elements.length) els.insert(0, elements.map(elementToYMap));
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
      els.push([elementToYMap(el)]);
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
      els.push([elementToYMap(copy)]);
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
