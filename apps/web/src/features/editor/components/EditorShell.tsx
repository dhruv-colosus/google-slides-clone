"use client";

import { useCallback } from "react";
import { TopBar } from "./TopBar";
import { Toolbar } from "./Toolbar";
import { SlideSidebar } from "./SlideSidebar";
import { SlideCanvas } from "./SlideCanvas";
import { PresenterShell } from "./PresenterShell";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useAutoSave } from "../hooks/useAutoSave";
import { useEditorState, useSetSaveState } from "../state/EditorContext";
import styles from "../editor.module.css";

function AutoSaveController() {
  const setSaveState = useSetSaveState();
  useAutoSave(setSaveState);
  return null;
}

export function EditorShell() {
  const { presenting } = useEditorState();
  const bindShortcuts = useKeyboardShortcuts();
  const setShellRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return bindShortcuts(null);
      node.focus();
      return bindShortcuts(node);
    },
    [bindShortcuts],
  );

  if (presenting) {
    return (
      <>
        <AutoSaveController />
        <PresenterShell />
      </>
    );
  }

  return (
    <div
      ref={setShellRef}
      tabIndex={-1}
      className={styles.shell}
      style={{ outline: "none" }}
    >
      <AutoSaveController />
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
