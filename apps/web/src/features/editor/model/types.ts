/**
 * Deck model — thin, local mirror of what will live in `packages/schema`
 * (zod + TS) once P1 lands. Intentionally structural only: nothing in this
 * file knows about Yjs, persistence, or rendering. When we swap the editor
 * store to a Yjs-backed provider in P3/P7, these types stay the same —
 * only the mutation layer changes.
 */

export type ElementId = string;
export type SlideId = string;

export type ElementType = "text" | "shape" | "image";

export type ShapeKind = "rect" | "ellipse" | "line" | "arrow";

export type TextRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
};

export type TextBlock = {
  runs: TextRun[];
  align?: "left" | "center" | "right";
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  placeholder?: string;
};

export type BaseElement = {
  id: ElementId;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  z: number;
  locked?: boolean;
};

export type TextElement = BaseElement & {
  type: "text";
  text: TextBlock;
};

export type ShapeElement = BaseElement & {
  type: "shape";
  shape: ShapeKind;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
};

export type ImageElement = BaseElement & {
  type: "image";
  src: string;
  alt?: string;
};

export type SlideElement = TextElement | ShapeElement | ImageElement;

export type SlideBackground =
  | { kind: "solid"; color: string }
  | { kind: "image"; src: string };

export type Slide = {
  id: SlideId;
  layoutId: string;
  background: SlideBackground;
  elements: SlideElement[];
  notes?: string;
};

export type DeckMeta = {
  title: string;
  themeId: string;
  pageWidth: number;
  pageHeight: number;
  schemaVersion: number;
};

export type Deck = {
  id: string;
  meta: DeckMeta;
  slides: Slide[];
};

export type ToolMode =
  | "select"
  | "text"
  | "shape"
  | "line"
  | "image"
  | "comment";

export type Selection = {
  slideId: SlideId | null;
  elementIds: ElementId[];
};
