"use client";

/**
 * Single-source-of-truth slide renderer. Both the main canvas and the
 * sidebar thumbnails render through this — the sidebar just wraps it in
 * a CSS scale transform. When P3 adds react-moveable, only the
 * `interactive` branch gains selection handles; the view-only branch
 * is reused as-is for the public `/v/{token}` viewer in P11.
 */

import type { Slide, SlideElement, TextElement, ShapeElement, ImageElement } from "../model/types";
import styles from "../editor.module.css";

type Props = {
  slide: Slide;
  pageWidth: number;
  pageHeight: number;
  interactive?: boolean;
};

export function SlideRenderer({ slide, pageWidth, pageHeight, interactive = true }: Props) {
  const bg = slide.background.kind === "solid" ? slide.background.color : "#fff";

  return (
    <div
      style={{
        position: "relative",
        width: pageWidth,
        height: pageHeight,
        background: bg,
        overflow: "hidden",
      }}
    >
      {slide.elements
        .slice()
        .sort((a, b) => a.z - b.z)
        .map((el) => (
          <ElementView key={el.id} element={el} interactive={interactive} />
        ))}
    </div>
  );
}

function ElementView({ element, interactive }: { element: SlideElement; interactive: boolean }) {
  switch (element.type) {
    case "text":
      return <TextElementView element={element} interactive={interactive} />;
    case "shape":
      return <ShapeElementView element={element} />;
    case "image":
      return <ImageElementView element={element} />;
  }
}

function TextElementView({ element, interactive }: { element: TextElement; interactive: boolean }) {
  const { text } = element;
  const hasContent = text.runs.some((r) => r.text.length > 0);
  const variant =
    (text.fontSize ?? 0) >= 36 ? "title" : hasContent ? "body" : "placeholder";

  return (
    <div
      className={interactive ? styles.placeholderFrame : undefined}
      data-variant={variant}
      style={{
        position: "absolute",
        left: element.x,
        top: element.y,
        width: element.w,
        height: element.h,
        textAlign: text.align,
        fontSize: text.fontSize,
        color: text.color ?? "#202124",
        fontFamily: text.fontFamily,
        display: "flex",
        alignItems: "center",
        justifyContent:
          text.align === "center"
            ? "center"
            : text.align === "right"
              ? "flex-end"
              : "flex-start",
        border: interactive ? undefined : "none",
      }}
    >
      {hasContent
        ? text.runs.map((run, i) => (
            <span
              key={i}
              style={{
                fontWeight: run.bold ? 600 : undefined,
                fontStyle: run.italic ? "italic" : undefined,
                textDecoration: run.underline ? "underline" : undefined,
              }}
            >
              {run.text}
            </span>
          ))
        : text.placeholder}
    </div>
  );
}

function ShapeElementView({ element }: { element: ShapeElement }) {
  const { shape, fill = "#e8eaed", stroke = "transparent", strokeWidth = 0, radius = 0 } = element;
  const common = {
    position: "absolute" as const,
    left: element.x,
    top: element.y,
    width: element.w,
    height: element.h,
  };
  if (shape === "rect") {
    return (
      <div
        style={{
          ...common,
          background: fill,
          border: strokeWidth ? `${strokeWidth}px solid ${stroke}` : undefined,
          borderRadius: radius,
        }}
      />
    );
  }
  if (shape === "ellipse") {
    return (
      <div
        style={{
          ...common,
          background: fill,
          border: strokeWidth ? `${strokeWidth}px solid ${stroke}` : undefined,
          borderRadius: "50%",
        }}
      />
    );
  }
  return (
    <svg style={common} viewBox={`0 0 ${element.w} ${element.h}`}>
      <line
        x1={0}
        y1={element.h / 2}
        x2={element.w}
        y2={element.h / 2}
        stroke={stroke === "transparent" ? "#3c4043" : stroke}
        strokeWidth={strokeWidth || 2}
      />
    </svg>
  );
}

function ImageElementView({ element }: { element: ImageElement }) {
  return (
    <img
      src={element.src}
      alt={element.alt ?? ""}
      style={{
        position: "absolute",
        left: element.x,
        top: element.y,
        width: element.w,
        height: element.h,
        objectFit: "cover",
      }}
    />
  );
}
