import type { TextBlock } from "../model/types";
import {
  attr,
  childrenByLocal,
  firstChildByLocal,
  firstDescendantByLocal,
  localName,
} from "./pptxXml";
import {
  pptxColorToCss,
  pptxFontSizePt,
  pptxLineSpacingToMultiple,
} from "./pptxUnits";

type Mark = { type: string; attrs?: Record<string, unknown> };

type PMNode = {
  type: string;
  text?: string;
  marks?: Mark[];
  attrs?: Record<string, unknown>;
  content?: PMNode[];
};

function mapAlign(
  v: string | null,
): "left" | "center" | "right" | "justify" | null {
  switch (v) {
    case "l":
      return "left";
    case "ctr":
      return "center";
    case "r":
      return "right";
    case "just":
      return "justify";
    default:
      return null;
  }
}

function readColorFromSolidFillParent(parent: Element): string | undefined {
  const fill = firstChildByLocal(parent, "solidFill");
  if (!fill) return undefined;
  const srgb = firstChildByLocal(fill, "srgbClr");
  if (srgb) return pptxColorToCss(attr(srgb, "val"));
  return undefined;
}

function runMarks(
  rPr: Element | null,
  rels: Map<string, { target: string; type: string }>,
): Mark[] {
  const marks: Mark[] = [];
  if (!rPr) return marks;
  if (attr(rPr, "b") === "1") marks.push({ type: "bold" });
  if (attr(rPr, "i") === "1") marks.push({ type: "italic" });
  const u = attr(rPr, "u");
  if (u && u !== "none") marks.push({ type: "underline" });
  const strike = attr(rPr, "strike");
  if (strike && strike !== "noStrike") marks.push({ type: "strike" });

  const color = readColorFromSolidFillParent(rPr);
  const latin = firstChildByLocal(rPr, "latin");
  const fontFamily = latin ? attr(latin, "typeface") ?? undefined : undefined;
  if (color || fontFamily) {
    const attrs: Record<string, unknown> = {};
    if (color) attrs.color = color;
    if (fontFamily) attrs.fontFamily = fontFamily;
    marks.push({ type: "textStyle", attrs });
  }

  const hlink = firstChildByLocal(rPr, "hlinkClick");
  if (hlink) {
    const rid = attr(hlink, "r:id");
    if (rid) {
      const rel = rels.get(rid);
      if (rel?.target) {
        marks.push({ type: "link", attrs: { href: rel.target } });
      }
    }
  }
  return marks;
}

function paragraphToNode(
  p: Element,
  rels: Map<string, { target: string; type: string }>,
  firstDefaults: {
    align?: "left" | "center" | "right" | "justify";
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    lineHeight?: number;
    taken?: boolean;
  },
  isFirstParagraph: boolean,
): PMNode {
  const pPr = firstChildByLocal(p, "pPr");
  const align = pPr ? mapAlign(attr(pPr, "algn")) : null;

  // Bullet detection — we simulate bullets with a leading "• " on the first run.
  const hasBullet =
    pPr != null &&
    (firstChildByLocal(pPr, "buChar") !== null ||
      firstChildByLocal(pPr, "buAutoNum") !== null);

  // Capture block-level defaults from the first paragraph / first run.
  if (!firstDefaults.taken) {
    if (align) firstDefaults.align = align;
    if (pPr) {
      const lnSpc = firstChildByLocal(pPr, "lnSpc");
      if (lnSpc) {
        const spcPct = firstChildByLocal(lnSpc, "spcPct");
        if (spcPct) {
          firstDefaults.lineHeight = pptxLineSpacingToMultiple(
            attr(spcPct, "val"),
          );
        }
      }
    }
  }

  const children: PMNode[] = [];
  let prependBullet = hasBullet && isFirstParagraph;
  // Actually bullets apply per-paragraph, so always prepend on bulleted paragraphs.
  prependBullet = hasBullet;

  for (let i = 0; i < p.children.length; i++) {
    const c = p.children[i];
    const ln = localName(c);
    if (ln === "r") {
      const rPr = firstChildByLocal(c, "rPr");
      const t = firstChildByLocal(c, "t");
      let text = t?.textContent ?? "";
      if (prependBullet) {
        text = `• ${text}`;
        prependBullet = false;
      }
      if (!firstDefaults.taken) {
        const sz = rPr ? pptxFontSizePt(attr(rPr, "sz")) : undefined;
        const color = rPr ? readColorFromSolidFillParent(rPr) : undefined;
        const latin = rPr ? firstChildByLocal(rPr, "latin") : null;
        const fontFamily = latin
          ? attr(latin, "typeface") ?? undefined
          : undefined;
        if (sz) firstDefaults.fontSize = sz;
        if (color) firstDefaults.color = color;
        if (fontFamily) firstDefaults.fontFamily = fontFamily;
        firstDefaults.taken = true;
      }
      if (text === "") continue;
      const marks = runMarks(rPr, rels);
      children.push({
        type: "text",
        text,
        ...(marks.length ? { marks } : {}),
      });
    } else if (ln === "br") {
      children.push({ type: "hardBreak" });
    } else if (ln === "fld") {
      const t = firstChildByLocal(c, "t");
      const text = t?.textContent ?? "";
      if (text) children.push({ type: "text", text });
    }
  }

  // If the paragraph had a bullet but no runs, emit a bullet-only node so
  // empty bulleted lines still render.
  if (prependBullet) {
    children.push({ type: "text", text: "• " });
  }

  const attrs: Record<string, unknown> = {};
  if (align) attrs.textAlign = align;

  const node: PMNode = { type: "paragraph" };
  if (Object.keys(attrs).length) node.attrs = attrs;
  if (children.length) node.content = children;
  return node;
}

export function parseTextFrame(
  txBody: Element,
  rels: Map<string, { target: string; type: string }>,
): { block: Partial<TextBlock>; contentJson: PMNode } {
  const paragraphs = childrenByLocal(txBody, "p");
  const firstDefaults: {
    align?: "left" | "center" | "right" | "justify";
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    lineHeight?: number;
    taken?: boolean;
  } = {};

  // lstStyle can carry inherited defaults — use as fallback for fontSize/color.
  const lstStyle = firstChildByLocal(txBody, "lstStyle");
  if (lstStyle) {
    const lvl1 = firstChildByLocal(lstStyle, "lvl1pPr");
    if (lvl1) {
      const defRPr = firstChildByLocal(lvl1, "defRPr");
      if (defRPr) {
        firstDefaults.fontSize = pptxFontSizePt(attr(defRPr, "sz"));
        const color = readColorFromSolidFillParent(defRPr);
        if (color) firstDefaults.color = color;
        const latin = firstChildByLocal(defRPr, "latin");
        if (latin) {
          const tf = attr(latin, "typeface");
          if (tf) firstDefaults.fontFamily = tf;
        }
      }
    }
  }

  const content: PMNode[] =
    paragraphs.length === 0
      ? [{ type: "paragraph" }]
      : paragraphs.map((p, idx) =>
          paragraphToNode(p, rels, firstDefaults, idx === 0),
        );

  const block: Partial<TextBlock> = {};
  if (firstDefaults.align) block.align = firstDefaults.align;
  if (firstDefaults.fontSize) block.fontSize = firstDefaults.fontSize;
  if (firstDefaults.fontFamily) block.fontFamily = firstDefaults.fontFamily;
  if (firstDefaults.color) block.color = firstDefaults.color;
  if (firstDefaults.lineHeight) block.lineHeight = firstDefaults.lineHeight;

  return {
    block,
    contentJson: { type: "doc", content },
  };
}

/**
 * `<a:r>` runs can appear outside of a `<a:p>` in some producers; also used
 * as a tiny helper to detect whether a txBody has any visible text at all.
 */
export function txBodyHasText(txBody: Element): boolean {
  const t = firstDescendantByLocal(txBody, "t");
  return (t?.textContent ?? "").trim().length > 0;
}
