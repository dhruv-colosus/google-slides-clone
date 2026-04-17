"use client";

import { useActiveSlide, useEditorActions, useEditorState } from "../state/EditorContext";
import type { Slide } from "../model/types";
import styles from "../editor.module.css";
import { SlideRenderer } from "./SlideRenderer";

const THUMB_WIDTH = 176; // px — matches ~200px sidebar minus padding

function Thumbnail({
  slide,
  index,
  active,
  pageWidth,
  pageHeight,
  onSelect,
}: {
  slide: Slide;
  index: number;
  active: boolean;
  pageWidth: number;
  pageHeight: number;
  onSelect: () => void;
}) {
  const scale = THUMB_WIDTH / pageWidth;
  return (
    <button
      className={styles.thumbRow}
      onClick={onSelect}
      style={{
        all: "unset",
        display: "grid",
        gridTemplateColumns: "16px 1fr",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
        cursor: "pointer",
      }}
    >
      <span className={styles.thumbIndex}>{index + 1}</span>
      <div
        className={`${styles.thumbFrame} ${active ? styles.thumbFrameActive : ""}`}
        style={{ width: THUMB_WIDTH, height: pageHeight * scale }}
      >
        <div
          className={styles.thumbInner}
          style={{
            width: pageWidth,
            height: pageHeight,
            transform: `scale(${scale})`,
          }}
        >
          <SlideRenderer slide={slide} pageWidth={pageWidth} pageHeight={pageHeight} interactive={false} />
        </div>
      </div>
    </button>
  );
}

export function SlideSidebar() {
  const { deck } = useEditorState();
  const active = useActiveSlide();
  const { selectSlide } = useEditorActions();

  return (
    <aside className={styles.sidebar} aria-label="Slide list">
      {deck.slides.map((slide, idx) => (
        <Thumbnail
          key={slide.id}
          slide={slide}
          index={idx}
          active={active?.id === slide.id}
          pageWidth={deck.meta.pageWidth}
          pageHeight={deck.meta.pageHeight}
          onSelect={() => selectSlide(slide.id)}
        />
      ))}
    </aside>
  );
}
