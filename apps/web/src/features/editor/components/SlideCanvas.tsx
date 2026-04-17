"use client";

import { useLayoutEffect, useRef, useState } from "react";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import NoteAltOutlinedIcon from "@mui/icons-material/NoteAltOutlined";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import { useActiveSlide, useEditorState } from "../state/EditorContext";
import { SlideRenderer } from "./SlideRenderer";
import styles from "../editor.module.css";

function HorizontalRuler({ width }: { width: number }) {
  const ticks = Array.from({ length: 10 }, (_, i) => i + 1);
  return (
    <div
      aria-hidden
      style={{
        position: "relative",
        width,
        height: 18,
        marginBottom: 8,
        background: "#fafbfc",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      {ticks.map((t) => (
        <span
          key={t}
          style={{
            position: "absolute",
            left: `${(t / 10) * 100}%`,
            top: 2,
            transform: "translateX(-50%)",
            fontSize: 10,
            color: "#5f6368",
          }}
        >
          {t}
        </span>
      ))}
    </div>
  );
}

function RightRail() {
  return (
    <div className={styles.rightRail} aria-label="Sidebar tools">
      <button className={styles.railButton} aria-label="Explore with AI">
        <AutoAwesomeRoundedIcon fontSize="small" />
      </button>
      <button className={styles.railButton} aria-label="Notes">
        <NoteAltOutlinedIcon fontSize="small" />
      </button>
      <button className={styles.railButton} aria-label="Images">
        <ImageOutlinedIcon fontSize="small" />
      </button>
      <button className={styles.railButton} aria-label="Files">
        <FolderOpenOutlinedIcon fontSize="small" />
      </button>
      <button className={styles.railButton} aria-label="Layout picker">
        <GridViewRoundedIcon fontSize="small" />
      </button>
    </div>
  );
}

export function SlideCanvas() {
  const { deck, zoom } = useEditorState();
  const slide = useActiveSlide();
  const areaRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);

  const { pageWidth, pageHeight } = deck.meta;

  useLayoutEffect(() => {
    function compute() {
      const el = areaRef.current;
      if (!el) return;
      const availableW = el.clientWidth - 80; // padding + ruler gutter
      const availableH = el.clientHeight - 120;
      const s = Math.min(availableW / pageWidth, availableH / pageHeight, 1.5);
      setFitScale(Math.max(0.2, s));
    }
    compute();
    const ro = new ResizeObserver(compute);
    if (areaRef.current) ro.observe(areaRef.current);
    return () => ro.disconnect();
  }, [pageWidth, pageHeight]);

  const scale = zoom === "fit" ? fitScale : zoom / 100;
  const scaledWidth = pageWidth * scale;

  return (
    <div ref={areaRef} className={styles.canvasArea}>
      <div>
        <HorizontalRuler width={scaledWidth} />
        <div
          className={styles.slide}
          style={{
            width: pageWidth,
            height: pageHeight,
            transform: `scale(${scale})`,
            transformOrigin: "top center",
            marginBottom: (scale - 1) * pageHeight, // reserve space after scale
          }}
        >
          {slide ? (
            <SlideRenderer slide={slide} pageWidth={pageWidth} pageHeight={pageHeight} />
          ) : null}
        </div>
      </div>
      <RightRail />
    </div>
  );
}
