import type { SlideBackground } from "../model/types";
import { attr, firstChildByLocal } from "./pptxXml";
import { pptxColorToCss } from "./pptxUnits";
import type { PptxZip, RelsMap } from "./pptxZip";
import { resolveRelTarget } from "./pptxZip";
import { bytesToDataUrl, mimeFromPath } from "./mediaUtils";

export async function parseSlideBackground(
  cSld: Element | null,
  rels: RelsMap,
  zip: PptxZip,
  slidePartPath: string,
): Promise<SlideBackground> {
  if (!cSld) return { kind: "theme" };
  const bg = firstChildByLocal(cSld, "bg");
  if (!bg) return { kind: "theme" };

  const bgPr = firstChildByLocal(bg, "bgPr");
  if (bgPr) {
    const solid = firstChildByLocal(bgPr, "solidFill");
    if (solid) {
      const srgb = firstChildByLocal(solid, "srgbClr");
      const color = pptxColorToCss(srgb ? attr(srgb, "val") : null);
      if (color) return { kind: "solid", color };
    }
    const blipFill = firstChildByLocal(bgPr, "blipFill");
    if (blipFill) {
      const blip = firstChildByLocal(blipFill, "blip");
      const rid = blip ? attr(blip, "r:embed") : null;
      if (rid) {
        const rel = rels.get(rid);
        if (rel) {
          const path = resolveRelTarget(slidePartPath, rel.target);
          const bytes = await zip.readBinary(path);
          if (bytes) {
            const mime = mimeFromPath(path);
            if (mime) {
              return { kind: "image", src: bytesToDataUrl(bytes, mime) };
            }
          }
        }
      }
    }
  }

  return { kind: "theme" };
}
