"use client";

import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded";
import DriveFileMoveOutlinedIcon from "@mui/icons-material/DriveFileMoveOutlined";
import CloudDoneOutlinedIcon from "@mui/icons-material/CloudDoneOutlined";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import SlideshowRoundedIcon from "@mui/icons-material/SlideshowRounded";
import { UserAvatar } from "@/features/auth";
import { useEditorActions, useEditorState } from "../state/EditorContext";
import styles from "../editor.module.css";

const MENU_ITEMS = [
  "File",
  "Edit",
  "View",
  "Insert",
  "Format",
  "Slide",
  "Arrange",
  "Tools",
  "Extensions",
  "Help",
];

function SlidesLogo() {
  return (
    <div className={styles.logo} aria-hidden>
      <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
        <path d="M10 6h20l10 10v26a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" fill="#F6BF26" />
        <path d="M30 6v10h10Z" fill="#E3A008" />
        <rect x="14" y="22" width="20" height="14" rx="1" fill="#fff" />
      </svg>
    </div>
  );
}

export function TopBar() {
  const { deck } = useEditorState();
  const { renameDeck } = useEditorActions();

  return (
    <header className={styles.topbar}>
      <div className={styles.topLeft}>
        <SlidesLogo />
        <div className={styles.titleBlock}>
          <div className={styles.titleRow}>
            <input
              className={styles.titleInput}
              value={deck.meta.title}
              onChange={(e) => renameDeck(e.target.value)}
              aria-label="Presentation title"
            />
            <button className={styles.iconButton} title="Star" aria-label="Star">
              <StarBorderRoundedIcon fontSize="small" />
            </button>
            <button className={styles.iconButton} title="Move" aria-label="Move">
              <DriveFileMoveOutlinedIcon fontSize="small" />
            </button>
            <button className={styles.iconButton} title="Save status" aria-label="Save status">
              <CloudDoneOutlinedIcon fontSize="small" />
            </button>
          </div>
          <nav className={styles.menuRow} aria-label="Menu bar">
            {MENU_ITEMS.map((m) => (
              <span key={m} className={styles.menuItem}>
                {m}
              </span>
            ))}
          </nav>
        </div>
      </div>

      <div />

      <div className={styles.topRight}>
        <button className={styles.iconButton} aria-label="Comments">
          <ChatBubbleOutlineOutlinedIcon fontSize="small" />
        </button>
        <button className={styles.iconButton} aria-label="Present with camera">
          <VideocamOutlinedIcon fontSize="small" />
        </button>
        <button className={styles.slideshowButton} aria-label="Slideshow">
          <SlideshowRoundedIcon fontSize="small" />
          <span>Slideshow</span>
          <KeyboardArrowDownRoundedIcon fontSize="small" />
        </button>
        <button className={styles.shareButton} aria-label="Share">
          <LockOutlinedIcon fontSize="small" />
          <span>Share</span>
          <KeyboardArrowDownRoundedIcon fontSize="small" />
        </button>
        <button className={styles.iconButton} aria-label="AI assistant">
          <AutoAwesomeOutlinedIcon fontSize="small" />
        </button>
        <UserAvatar size={32} />
      </div>
    </header>
  );
}
