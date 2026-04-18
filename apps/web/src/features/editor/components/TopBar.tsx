"use client";

import { useState } from "react";
import Link from "next/link";
import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded";
import DriveFileMoveOutlinedIcon from "@mui/icons-material/DriveFileMoveOutlined";
import CloudDoneOutlinedIcon from "@mui/icons-material/CloudDoneOutlined";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import ArrowDropDownRoundedIcon from "@mui/icons-material/ArrowDropDownRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import { UserAvatar } from "@/features/auth";
import { useEditorActions, useEditorState } from "../state/EditorContext";
import { MenuBar } from "./MenuBar";
import styles from "../editor.module.css";

function SlidesLogoLink() {
  return (
    <Link
      href="/"
      className={`${styles.logo} ${styles.logoLink}`}
      aria-label="Home"
    >
      <svg width="36" height="36" viewBox="0 0 48 48" fill="none" aria-hidden>
        <path d="M10 6h20l10 10v26a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" fill="#F6BF26" />
        <path d="M30 6v10h10Z" fill="#E3A008" />
        <rect x="14" y="22" width="20" height="14" rx="1" fill="#fff" />
      </svg>
    </Link>
  );
}

function ShareButton() {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.shareWrap}>
      {open && (
        <div className={styles.shareBackdrop} onClick={() => setOpen(false)} />
      )}
      <div
        className={`${styles.splitButton} ${styles.splitButtonPrimary}`}
        role="group"
        aria-label="Share"
      >
        <button className={styles.splitLabel} aria-label="Share">
          <LockOutlinedIcon fontSize="small" />
          <span>Share</span>
        </button>
        <button
          className={styles.splitCaret}
          aria-label="Share options"
          onClick={() => setOpen((v) => !v)}
        >
          <ArrowDropDownRoundedIcon fontSize="small" />
        </button>
      </div>
      {open && (
        <div className={styles.shareDropdown}>
          <button
            className={styles.shareDropdownItem}
            onClick={() => setOpen(false)}
          >
            <LinkRoundedIcon fontSize="small" />
            <span>Copy link</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function TopBar() {
  const { deck } = useEditorState();
  const { renameDeck } = useEditorActions();

  return (
    <header className={styles.topbar}>
      <div className={styles.topLeft}>
        <SlidesLogoLink />
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
          <MenuBar />
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
        <div className={styles.splitButton} role="group" aria-label="Slideshow">
          <button className={styles.splitLabel} aria-label="Start slideshow">
            <span>Slideshow</span>
          </button>
          <button className={styles.splitCaret} aria-label="Slideshow options">
            <ArrowDropDownRoundedIcon fontSize="small" />
          </button>
        </div>
        <ShareButton />
        <button className={styles.iconButton} aria-label="AI assistant">
          <AutoAwesomeIcon fontSize="small" />
        </button>
        <UserAvatar size={32} />
      </div>
    </header>
  );
}
