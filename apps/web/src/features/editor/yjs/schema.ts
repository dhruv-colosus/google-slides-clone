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
import type {
  BaseElement,
  Deck,
  DeckMeta,
  ElementId,
  ImageCrop,
  ImageElement,
  ShapeElement,
  Slide,
  SlideElement,
  TextElement,
} from "../model/types";

export type YSlide = Y.Map<unknown>;
export type YElement = Y.Map<unknown>;

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
    m.set("text", { ...el.text });
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
  doc.transact(() => {
    meta.set("id", deck.id);
    meta.set("title", deck.meta.title);
    meta.set("themeId", deck.meta.themeId);
    meta.set("pageWidth", deck.meta.pageWidth);
    meta.set("pageHeight", deck.meta.pageHeight);
    meta.set("schemaVersion", deck.meta.schemaVersion);
    if (slides.length) slides.delete(0, slides.length);
    slides.insert(0, deck.slides.map(slideToYMap));
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
    const el: TextElement = {
      ...base,
      type,
      text: { ...(m.get("text") as TextElement["text"]) },
    };
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

export { slideToYMap, elementToYMap };
