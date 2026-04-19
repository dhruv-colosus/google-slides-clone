/**
 * Y.Doc schema and projection helpers.
 *
 * Structure:
 *   doc.getMap('meta')   -> { id, title, themeId, pageWidth, pageHeight, schemaVersion }
 *   doc.getArray('slides') -> Y.Array<Y.Map>
 *     slide Y.Map: { id, layoutId, background (plain), notes, elements: Y.Array<Y.Map> }
 *       element Y.Map: { id, type, x, y, w, h, z, rotation, locked, ...type-specific }
 *
 *   For text elements, `text` holds the block-level props (align, fontSize,
 *   fontFamily, color, lineHeight, placeholder) as plain JSON, and `doc`
 *   holds a Y.XmlFragment bound to Tiptap via y-prosemirror.
 */

import * as Y from "yjs";
import {
  prosemirrorJSONToYXmlFragment,
  yXmlFragmentToProsemirrorJSON,
} from "y-prosemirror";
import { getTextSchema } from "../tiptap/extensions";
import type {
  BaseElement,
  Comment,
  Deck,
  DeckMeta,
  ElementId,
  ImageCrop,
  ImageElement,
  ShapeElement,
  Slide,
  SlideElement,
  TextBlock,
  TextElement,
} from "../model/types";

export type YSlide = Y.Map<unknown>;
export type YElement = Y.Map<unknown>;
export type YComment = Y.Map<unknown>;

const COMMENT_KEYS: Array<keyof Comment> = [
  "id",
  "slideId",
  "authorId",
  "authorName",
  "authorPicture",
  "text",
  "createdAt",
  "updatedAt",
  "resolvedAt",
  "resolvedByName",
];

export function commentToYMap(c: Comment): YComment {
  const m = new Y.Map<unknown>();
  for (const k of COMMENT_KEYS) m.set(k, c[k]);
  return m;
}

export function readComment(m: YComment): Comment {
  return {
    id: m.get("id") as string,
    slideId: m.get("slideId") as string,
    authorId: m.get("authorId") as string,
    authorName: m.get("authorName") as string,
    authorPicture: (m.get("authorPicture") as string | null) ?? null,
    text: m.get("text") as string,
    createdAt: m.get("createdAt") as number,
    updatedAt: (m.get("updatedAt") as number | null) ?? null,
    resolvedAt: (m.get("resolvedAt") as number | null) ?? null,
    resolvedByName: (m.get("resolvedByName") as string | null) ?? null,
  };
}

export function findCommentYMap(doc: Y.Doc, commentId: string): YComment | null {
  const comments = doc.getArray<YComment>("comments");
  for (const c of comments) {
    if (c.get("id") === commentId) return c;
  }
  return null;
}

export function findCommentIndex(doc: Y.Doc, commentId: string): number {
  const comments = doc.getArray<YComment>("comments");
  for (let i = 0; i < comments.length; i++) {
    if (comments.get(i).get("id") === commentId) return i;
  }
  return -1;
}

export function sanitizeTextBlock(text: TextBlock): TextBlock {
  // `contentJson` is a derived projection of the Y.XmlFragment; the fragment
  // is authoritative, so we must never write it back into the Y.Map.
  const { contentJson: _drop, ...rest } = text;
  return rest;
}

function elementToYMap(el: SlideElement): YElement {
  const m = new Y.Map<unknown>();
  m.set("id", el.id);
  m.set("type", el.type);
  m.set("x", el.x);
  m.set("y", el.y);
  m.set("w", el.w);
  m.set("h", el.h);
  m.set("z", el.z);
  if (el.rotation !== undefined) m.set("rotation", el.rotation);
  if (el.locked !== undefined) m.set("locked", el.locked);
  if (el.type === "text") {
    m.set("text", sanitizeTextBlock(el.text));
    m.set("doc", new Y.XmlFragment());
  } else if (el.type === "shape") {
    m.set("shape", el.shape);
    if (el.fill !== undefined) m.set("fill", el.fill);
    if (el.stroke !== undefined) m.set("stroke", el.stroke);
    if (el.strokeWidth !== undefined) m.set("strokeWidth", el.strokeWidth);
    if (el.radius !== undefined) m.set("radius", el.radius);
  } else {
    m.set("src", el.src);
    if (el.alt !== undefined) m.set("alt", el.alt);
    if (el.crop !== undefined) m.set("crop", { ...el.crop });
  }
  return m;
}

function slideToYMap(s: Slide): YSlide {
  const m = new Y.Map<unknown>();
  m.set("id", s.id);
  m.set("layoutId", s.layoutId);
  m.set("background", { ...s.background });
  if (s.notes !== undefined) m.set("notes", s.notes);
  const els = new Y.Array<YElement>();
  m.set("elements", els);
  els.insert(0, s.elements.map(elementToYMap));
  return m;
}

export function hydrateDoc(doc: Y.Doc, deck: Deck) {
  const meta = doc.getMap<unknown>("meta");
  const slides = doc.getArray<YSlide>("slides");
  const comments = doc.getArray<YComment>("comments");
  doc.transact(() => {
    meta.set("id", deck.id);
    meta.set("title", deck.meta.title);
    meta.set("themeId", deck.meta.themeId);
    meta.set("pageWidth", deck.meta.pageWidth);
    meta.set("pageHeight", deck.meta.pageHeight);
    meta.set("schemaVersion", deck.meta.schemaVersion);
    if (slides.length) slides.delete(0, slides.length);
    slides.insert(0, deck.slides.map(slideToYMap));
    if (comments.length) comments.delete(0, comments.length);
    if (deck.comments?.length) {
      comments.insert(0, deck.comments.map(commentToYMap));
    }

    // Second pass: now that every YMap/YArray is attached to the doc, populate
    // each text element's Y.XmlFragment from its persisted ProseMirror JSON.
    // This restores inline formatting, marks, and typed text after reload.
    let schema: ReturnType<typeof getTextSchema> | null = null;
    for (let i = 0; i < deck.slides.length; i++) {
      const slideElements = deck.slides[i].elements;
      const ySlide = slides.get(i);
      const yEls = ySlide.get("elements") as Y.Array<YElement>;
      for (let j = 0; j < slideElements.length; j++) {
        const el = slideElements[j];
        if (el.type !== "text") continue;
        const contentJson = el.text.contentJson;
        if (!contentJson || typeof contentJson !== "object") continue;
        const yEl = yEls.get(j);
        const fragment = yEl.get("doc");
        if (!(fragment instanceof Y.XmlFragment)) continue;
        try {
          if (!schema) schema = getTextSchema();
          prosemirrorJSONToYXmlFragment(schema, contentJson, fragment);
        } catch (err) {
          console.warn("[hydrateDoc] failed to hydrate text fragment", err);
        }
      }
    }
  }, "hydrate");
}

function readElement(m: YElement): SlideElement {
  const type = m.get("type") as "text" | "shape" | "image";
  const base: BaseElement = {
    id: m.get("id") as ElementId,
    x: m.get("x") as number,
    y: m.get("y") as number,
    w: m.get("w") as number,
    h: m.get("h") as number,
    z: m.get("z") as number,
    rotation: m.get("rotation") as number | undefined,
    locked: m.get("locked") as boolean | undefined,
  };
  if (type === "text") {
    const text = { ...(m.get("text") as TextElement["text"]) };
    const fragment = m.get("doc");
    if (fragment instanceof Y.XmlFragment) {
      try {
        text.contentJson = yXmlFragmentToProsemirrorJSON(fragment);
      } catch {
        // fragment serialization failed — leave contentJson undefined
      }
    }
    const el: TextElement = { ...base, type, text };
    return el;
  }
  if (type === "shape") {
    const el: ShapeElement = {
      ...base,
      type,
      shape: m.get("shape") as ShapeElement["shape"],
      fill: m.get("fill") as string | undefined,
      stroke: m.get("stroke") as string | undefined,
      strokeWidth: m.get("strokeWidth") as number | undefined,
      radius: m.get("radius") as number | undefined,
    };
    return el;
  }
  const rawCrop = m.get("crop") as ImageCrop | undefined;
  const el: ImageElement = {
    ...base,
    type,
    src: m.get("src") as string,
    alt: m.get("alt") as string | undefined,
    crop: rawCrop ? { ...rawCrop } : undefined,
  };
  return el;
}

function readSlide(m: YSlide): Slide {
  const elsArr = m.get("elements") as Y.Array<YElement>;
  return {
    id: m.get("id") as string,
    layoutId: m.get("layoutId") as string,
    background: m.get("background") as Slide["background"],
    notes: (m.get("notes") as string | undefined) || undefined,
    elements: elsArr.toArray().map(readElement),
  };
}

export function readDeck(doc: Y.Doc): Deck {
  const meta = doc.getMap<unknown>("meta");
  const slides = doc.getArray<YSlide>("slides");
  const comments = doc.getArray<YComment>("comments");
  const deckMeta: DeckMeta = {
    title: meta.get("title") as string,
    themeId: meta.get("themeId") as string,
    pageWidth: meta.get("pageWidth") as number,
    pageHeight: meta.get("pageHeight") as number,
    schemaVersion: meta.get("schemaVersion") as number,
  };
  return {
    id: meta.get("id") as string,
    meta: deckMeta,
    slides: slides.toArray().map(readSlide),
    comments: comments.toArray().map(readComment),
  };
}

export function findSlideYMap(doc: Y.Doc, slideId: string): YSlide | null {
  const slides = doc.getArray<YSlide>("slides");
  for (const s of slides) {
    if (s.get("id") === slideId) return s;
  }
  return null;
}

export function findSlideIndex(doc: Y.Doc, slideId: string): number {
  const slides = doc.getArray<YSlide>("slides");
  for (let i = 0; i < slides.length; i++) {
    if (slides.get(i).get("id") === slideId) return i;
  }
  return -1;
}

export function findElementYMap(
  slide: YSlide,
  elementId: ElementId,
): { el: YElement; index: number } | null {
  const els = slide.get("elements") as Y.Array<YElement>;
  for (let i = 0; i < els.length; i++) {
    const el = els.get(i);
    if (el.get("id") === elementId) return { el, index: i };
  }
  return null;
}

export function populateTextFragmentFromJson(yEl: YElement, contentJson: unknown): void {
  if (!contentJson || typeof contentJson !== "object") return;
  const fragment = yEl.get("doc");
  if (!(fragment instanceof Y.XmlFragment)) return;
  try {
    prosemirrorJSONToYXmlFragment(getTextSchema(), contentJson, fragment);
  } catch (err) {
    console.warn("[populateTextFragment] failed to hydrate text fragment", err);
  }
}

export { slideToYMap, elementToYMap };
