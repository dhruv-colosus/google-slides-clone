"use client";

import { TopBar } from "./TopBar";
import { Toolbar } from "./Toolbar";
import { SlideSidebar } from "./SlideSidebar";
import { SlideCanvas } from "./SlideCanvas";
import { SpeakerNotes } from "./SpeakerNotes";
import styles from "../editor.module.css";

export function EditorShell() {
  return (
    <div className={styles.shell}>
      <TopBar />
      <Toolbar />
      <div className={styles.body}>
        <SlideSidebar />
        <div className={styles.workspace}>
          <SlideCanvas />
          <SpeakerNotes />
        </div>
      </div>
    </div>
  );
}
