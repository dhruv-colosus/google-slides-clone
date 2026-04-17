"use client";

import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import UndoRoundedIcon from "@mui/icons-material/UndoRounded";
import RedoRoundedIcon from "@mui/icons-material/RedoRounded";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import FormatPaintOutlinedIcon from "@mui/icons-material/FormatPaintOutlined";
import ZoomInRoundedIcon from "@mui/icons-material/ZoomInRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import NearMeRoundedIcon from "@mui/icons-material/NearMeRounded";
import TextFieldsRoundedIcon from "@mui/icons-material/TextFieldsRounded";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import AddCommentOutlinedIcon from "@mui/icons-material/AddCommentOutlined";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import { useEditorActions, useEditorState } from "../state/EditorContext";
import type { ToolMode } from "../model/types";
import styles from "../editor.module.css";

type ToolDef = { id: ToolMode; label: string; icon: React.ElementType };

const TOOLS: ToolDef[] = [
  { id: "select", label: "Select", icon: NearMeRoundedIcon },
  { id: "text", label: "Text box", icon: TextFieldsRoundedIcon },
  { id: "shape", label: "Shape", icon: CategoryOutlinedIcon },
  { id: "line", label: "Line", icon: TimelineRoundedIcon },
  { id: "comment", label: "Add comment", icon: AddCommentOutlinedIcon },
];

export function Toolbar() {
  const { tool, zoom } = useEditorState();
  const { setTool } = useEditorActions();

  return (
    <div className={styles.toolbar}>
      <button className={styles.toolbarButton} aria-label="Search the menus">
        <SearchRoundedIcon fontSize="small" />
      </button>
      <button className={styles.toolbarButton} aria-label="Insert">
        <AddRoundedIcon fontSize="small" />
      </button>
      <button className={styles.toolbarButton} aria-label="Insert with AI">
        <AutoAwesomeRoundedIcon fontSize="small" />
      </button>

      <span className={styles.toolbarDivider} />

      <div className={styles.toolbarGroup}>
        <button className={styles.toolbarButton} aria-label="Undo">
          <UndoRoundedIcon fontSize="small" />
        </button>
        <button className={styles.toolbarButton} aria-label="Redo">
          <RedoRoundedIcon fontSize="small" />
        </button>
      </div>

      <span className={styles.toolbarDivider} />

      <button className={styles.toolbarButton} aria-label="Print">
        <PrintOutlinedIcon fontSize="small" />
      </button>
      <button className={styles.toolbarButton} aria-label="Paint format">
        <FormatPaintOutlinedIcon fontSize="small" />
      </button>
      <button className={styles.toolbarButton} aria-label="Zoom">
        <ZoomInRoundedIcon fontSize="small" />
      </button>

      <div className={styles.zoomPill} aria-label="Zoom level">
        <span>{zoom === "fit" ? "Fit" : `${zoom}%`}</span>
        <KeyboardArrowDownRoundedIcon fontSize="small" />
      </div>

      <span className={styles.toolbarDivider} />

      <div className={styles.toolbarGroup}>
        {TOOLS.map((t) => {
          const Icon = t.icon;
          const active = tool === t.id;
          return (
            <button
              key={t.id}
              className={`${styles.toolbarButton} ${
                active ? styles.toolbarButtonActive : ""
              }`}
              onClick={() => setTool(t.id)}
              aria-pressed={active}
              aria-label={t.label}
              title={t.label}
            >
              <Icon fontSize="small" />
              {t.id === "shape" || t.id === "line" ? (
                <KeyboardArrowDownRoundedIcon fontSize="small" />
              ) : null}
            </button>
          );
        })}
      </div>

      <span className={styles.toolbarDivider} />

      <button className={styles.toolbarButton}>
        <AddCommentOutlinedIcon fontSize="small" />
      </button>

      <span className={styles.toolbarDivider} />

      <button className={styles.toolbarButton}>Background</button>
      <button className={styles.toolbarButton}>Layout</button>
      <button className={styles.toolbarButton}>Theme</button>
      <button className={styles.toolbarButton}>Transition</button>

      <div className={styles.toolbarSpacer} />

      <button className={styles.toolbarButton} aria-label="Collapse toolbar">
        <ExpandLessRoundedIcon fontSize="small" />
      </button>
    </div>
  );
}
