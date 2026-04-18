/**
 * Align / distribute math. Pure functions — input is the current set of
 * elements (just the fields we care about) plus the page dimensions; output
 * is a list of { id, patch } updates the caller feeds into updateElements.
 *
 * Single-element alignment snaps to the slide rectangle. Multi-element
 * alignment uses the bounding box of the selection. Distribute is only
 * meaningful with 3+ elements.
 */

export type AlignTarget = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type AlignUpdate = {
  id: string;
  patch: { x?: number; y?: number };
};

export type HorizontalAlign = "left" | "center" | "right";
export type VerticalAlign = "top" | "middle" | "bottom";

type PageSize = { pageWidth: number; pageHeight: number };

function selectionBounds(targets: AlignTarget[]) {
  const left = Math.min(...targets.map((t) => t.x));
  const right = Math.max(...targets.map((t) => t.x + t.w));
  const top = Math.min(...targets.map((t) => t.y));
  const bottom = Math.max(...targets.map((t) => t.y + t.h));
  return { left, right, top, bottom };
}

export function alignHorizontal(
  targets: AlignTarget[],
  mode: HorizontalAlign,
  page: PageSize,
): AlignUpdate[] {
  if (targets.length === 0) return [];
  const bounds =
    targets.length === 1
      ? { left: 0, right: page.pageWidth, top: 0, bottom: page.pageHeight }
      : selectionBounds(targets);
  return targets.map((t) => {
    const patch: { x?: number } = {};
    if (mode === "left") patch.x = Math.round(bounds.left);
    else if (mode === "center")
      patch.x = Math.round((bounds.left + bounds.right) / 2 - t.w / 2);
    else patch.x = Math.round(bounds.right - t.w);
    return { id: t.id, patch };
  });
}

export function alignVertical(
  targets: AlignTarget[],
  mode: VerticalAlign,
  page: PageSize,
): AlignUpdate[] {
  if (targets.length === 0) return [];
  const bounds =
    targets.length === 1
      ? { left: 0, right: page.pageWidth, top: 0, bottom: page.pageHeight }
      : selectionBounds(targets);
  return targets.map((t) => {
    const patch: { y?: number } = {};
    if (mode === "top") patch.y = Math.round(bounds.top);
    else if (mode === "middle")
      patch.y = Math.round((bounds.top + bounds.bottom) / 2 - t.h / 2);
    else patch.y = Math.round(bounds.bottom - t.h);
    return { id: t.id, patch };
  });
}

/**
 * Distribute equalises spacing between adjacent elements along one axis.
 * The two outermost elements stay pinned; interior elements shift so that
 * the gaps between consecutive bounding boxes are equal. Needs 3+ targets.
 */
export function distributeHorizontal(targets: AlignTarget[]): AlignUpdate[] {
  if (targets.length < 3) return [];
  const sorted = [...targets].sort((a, b) => a.x + a.w / 2 - (b.x + b.w / 2));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const totalSpan = last.x + last.w - first.x;
  const occupied = sorted.reduce((sum, t) => sum + t.w, 0);
  const gap = (totalSpan - occupied) / (sorted.length - 1);
  const updates: AlignUpdate[] = [];
  let cursor = first.x + first.w + gap;
  for (let i = 1; i < sorted.length - 1; i++) {
    const t = sorted[i];
    updates.push({ id: t.id, patch: { x: Math.round(cursor) } });
    cursor += t.w + gap;
  }
  return updates;
}

export function distributeVertical(targets: AlignTarget[]): AlignUpdate[] {
  if (targets.length < 3) return [];
  const sorted = [...targets].sort((a, b) => a.y + a.h / 2 - (b.y + b.h / 2));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const totalSpan = last.y + last.h - first.y;
  const occupied = sorted.reduce((sum, t) => sum + t.h, 0);
  const gap = (totalSpan - occupied) / (sorted.length - 1);
  const updates: AlignUpdate[] = [];
  let cursor = first.y + first.h + gap;
  for (let i = 1; i < sorted.length - 1; i++) {
    const t = sorted[i];
    updates.push({ id: t.id, patch: { y: Math.round(cursor) } });
    cursor += t.h + gap;
  }
  return updates;
}
