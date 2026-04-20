"use client";

import { useCallback } from "react";
import { TopBar } from "./TopBar";
import { TopBarReadOnly } from "./TopBarReadOnly";
import { Toolbar } from "./Toolbar";
import { SlideSidebar } from "./SlideSidebar";
import { SlideCanvas } from "./SlideCanvas";
import { PresenterShell } from "./PresenterShell";
import { UndoableToast } from "./UndoableToast";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useAutoSave } from "../hooks/useAutoSave";
import { useEditorState, useSetSaveState } from "../state/EditorContext";
import { CommentsPanel } from "../comments";
import styles from "../editor.module.css";

function AutoSaveController() {
  const setSaveState = useSetSaveState();
  useAutoSave(setSaveState);
  return null;
}

export function EditorShell() {
  const { presenting, commentsPanelOpen, readOnly } = useEditorState();
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
        {!readOnly && <AutoSaveController />}
        <PresenterShell />
      </>
    );
  }

  const showCommentsPanel = commentsPanelOpen && !readOnly;

  return (
    <div
      ref={setShellRef}
      tabIndex={-1}
      className={`${styles.shell}${
        showCommentsPanel ? ` ${styles.shellWithComments}` : ""
      }${readOnly ? ` ${styles.shellReadOnly}` : ""}`}
      style={{ outline: "none" }}
    >
      {!readOnly && <AutoSaveController />}
      {readOnly ? <TopBarReadOnly /> : <TopBar />}
      {!readOnly && <Toolbar />}
      <div className={styles.body}>
        <SlideSidebar />
        <div className={styles.workspace}>
          <SlideCanvas />
        </div>
      </div>
      {showCommentsPanel && <CommentsPanel />}
      <UndoableToast />
    </div>
  );
}
