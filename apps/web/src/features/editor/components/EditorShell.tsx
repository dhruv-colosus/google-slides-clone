"use client";

import { useCallback } from "react";
import { TopBar } from "./TopBar";
import { Toolbar } from "./Toolbar";
import { SlideSidebar } from "./SlideSidebar";
import { SlideCanvas } from "./SlideCanvas";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import styles from "../editor.module.css";

export function EditorShell() {
  const bindShortcuts = useKeyboardShortcuts();
  const setShellRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return bindShortcuts(null);
      node.focus();
      return bindShortcuts(node);
    },
    [bindShortcuts],
  );

  return (
    <div
      ref={setShellRef}
      tabIndex={-1}
      className={styles.shell}
      style={{ outline: "none" }}
    >
      <TopBar />
      <Toolbar />
      <div className={styles.body}>
        <SlideSidebar />
        <div className={styles.workspace}>
          <SlideCanvas />
        </div>
      </div>
    </div>
  );
}
