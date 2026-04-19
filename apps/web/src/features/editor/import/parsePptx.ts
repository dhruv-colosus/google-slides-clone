import type { Slide, SlideElement } from "../model/types";
import {
  attr,
  childrenByLocal,
  firstChildByLocal,
  firstDescendantByLocal,
  hasDescendantLocal,
  localName,
  parseXml,
} from "./pptxXml";
import { emuToPx } from "./pptxUnits";
import {
  openPptx,
  PptxError,
  readRels,
  resolveRelTarget,
  type PptxZip,
  type RelsMap,
} from "./pptxZip";
import { parseSpElement } from "./parseSpElement";
import { parsePicElement } from "./parsePicElement";
import { parseSlideBackground } from "./parseSlideBackground";
import {
  emptySkipReport,
  recordSkip,
  type ParsedDeck,
  type SkipReport,
} from "./types";

export { PptxError } from "./pptxZip";
export type { ParsedDeck, SkipReport, SkipReason } from "./types";

const MAX_GROUP_DEPTH = 10;

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

async function readPresentation(zip: PptxZip): Promise<{
  sourceWidthPx: number;
  sourceHeightPx: number;
  slidePartPaths: string[];
}> {
  const text = await zip.readText("ppt/presentation.xml");
  if (!text) throw new PptxError("not-pptx", "Missing ppt/presentation.xml");
  const doc = parseXml(text);
  const root = doc.documentElement;
  const sldSz = firstDescendantByLocal(root, "sldSz");
  const cx = sldSz ? Number(attr(sldSz, "cx") ?? "9144000") : 9144000;
  const cy = sldSz ? Number(attr(sldSz, "cy") ?? "6858000") : 6858000;

  const idLst = firstDescendantByLocal(root, "sldIdLst");
  const ids = idLst ? childrenByLocal(idLst, "sldId") : [];
  const rels = await readRels(zip, "ppt/presentation.xml");
  const slidePartPaths: string[] = [];
  for (const idEl of ids) {
    const rid = attr(idEl, "r:id");
    if (!rid) continue;
    const rel = rels.get(rid);
    if (!rel) continue;
    slidePartPaths.push(resolveRelTarget("ppt/presentation.xml", rel.target));
  }

  return {
    sourceWidthPx: emuToPx(cx),
    sourceHeightPx: emuToPx(cy),
    slidePartPaths,
  };
}

type Rescale = (n: number, axis: "x" | "y") => number;

async function walkSpTree(
  spTree: Element,
  rels: RelsMap,
  zip: PptxZip,
  slidePartPath: string,
  rescale: Rescale,
  slideIndex: number,
  skip: SkipReport,
  depth: number,
  zCounter: { z: number },
): Promise<SlideElement[]> {
  const elements: SlideElement[] = [];
  if (depth > MAX_GROUP_DEPTH) {
    recordSkip(skip, slideIndex, "group-transform");
    return elements;
  }

  for (let i = 0; i < spTree.children.length; i++) {
    const child = spTree.children[i];
    const ln = localName(child);
    switch (ln) {
      case "sp":
      case "cxnSp": {
        const parsed = parseSpElement(
          child,
          rels,
          rescale,
          zCounter.z,
          slideIndex,
          skip,
          () => newId("el"),
        );
        if (parsed.shape) {
          elements.push(parsed.shape);
          zCounter.z += 1;
        }
        if (parsed.text) {
          parsed.text.z = zCounter.z;
          elements.push(parsed.text);
          zCounter.z += 1;
        }
        break;
      }
      case "pic": {
        const el = await parsePicElement(
          child,
          rels,
          zip,
          slidePartPath,
          rescale,
          zCounter.z,
          slideIndex,
          skip,
          () => newId("el"),
        );
        if (el) {
          elements.push(el);
          zCounter.z += 1;
        }
        break;
      }
      case "grpSp": {
        // Non-identity group xfrm is not applied in v1.
        const grpSpPr = firstChildByLocal(child, "grpSpPr");
        const xfrm = grpSpPr ? firstChildByLocal(grpSpPr, "xfrm") : null;
        if (xfrm) {
          const off = firstChildByLocal(xfrm, "off");
          const chOff = firstChildByLocal(xfrm, "chOff");
          const hasTransform =
            (off && (attr(off, "x") !== "0" || attr(off, "y") !== "0")) ||
            (chOff && (attr(chOff, "x") !== "0" || attr(chOff, "y") !== "0"));
          if (hasTransform) recordSkip(skip, slideIndex, "group-transform");
        }
        const nested = await walkSpTree(
          child,
          rels,
          zip,
          slidePartPath,
          rescale,
          slideIndex,
          skip,
          depth + 1,
          zCounter,
        );
        elements.push(...nested);
        break;
      }
      case "graphicFrame": {
        if (hasDescendantLocal(child, "chart")) {
          recordSkip(skip, slideIndex, "chart");
        } else if (hasDescendantLocal(child, "tbl")) {
          recordSkip(skip, slideIndex, "table");
        } else if (hasDescendantLocal(child, "relIds")) {
          recordSkip(skip, slideIndex, "smartart");
        } else {
          recordSkip(skip, slideIndex, "ole");
        }
        break;
      }
      default:
        // nvGrpSpPr, grpSpPr, extLst etc. — silently ignore
        break;
    }
  }
  return elements;
}

async function parseSlide(
  zip: PptxZip,
  partPath: string,
  rescale: Rescale,
  slideIndex: number,
  skip: SkipReport,
): Promise<Slide> {
  const text = await zip.readText(partPath);
  if (!text) {
    return {
      id: newId("slide"),
      layoutId: "blank",
      background: { kind: "theme" },
      elements: [],
    };
  }
  const doc = parseXml(text);
  const root = doc.documentElement;
  const rels = await readRels(zip, partPath);

  const cSld = firstChildByLocal(root, "cSld");
  const background = await parseSlideBackground(cSld, rels, zip, partPath);

  const spTree = cSld ? firstChildByLocal(cSld, "spTree") : null;
  const zCounter = { z: 1 };
  const elements = spTree
    ? await walkSpTree(
        spTree,
        rels,
        zip,
        partPath,
        rescale,
        slideIndex,
        skip,
        0,
        zCounter,
      )
    : [];

  return {
    id: newId("slide"),
    layoutId: "blank",
    background,
    elements,
  };
}

export async function parsePptx(
  file: File,
  target: { pageWidth: number; pageHeight: number },
): Promise<ParsedDeck> {
  const zip = await openPptx(file);
  const { sourceWidthPx, sourceHeightPx, slidePartPaths } =
    await readPresentation(zip);

  const sx = target.pageWidth / Math.max(1, sourceWidthPx);
  const sy = target.pageHeight / Math.max(1, sourceHeightPx);
  const rescale: Rescale = (n, axis) => n * (axis === "x" ? sx : sy);

  const skip: SkipReport = emptySkipReport();
  const slides: Slide[] = [];
  for (let i = 0; i < slidePartPaths.length; i++) {
    try {
      const slide = await parseSlide(zip, slidePartPaths[i], rescale, i, skip);
      slides.push(slide);
    } catch (err) {
      console.warn(`[parsePptx] slide ${i + 1} failed`, err);
      // Still push a blank slide so indices stay aligned with the report.
      slides.push({
        id: newId("slide"),
        layoutId: "blank",
        background: { kind: "theme" },
        elements: [],
      });
    }
  }

  return {
    slides,
    sourcePageWidthPx: sourceWidthPx,
    sourcePageHeightPx: sourceHeightPx,
    skipReport: skip,
  };
}
