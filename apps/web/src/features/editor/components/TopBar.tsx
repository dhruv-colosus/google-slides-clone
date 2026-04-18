"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded";
import DriveFileMoveOutlinedIcon from "@mui/icons-material/DriveFileMoveOutlined";
import CloudDoneOutlinedIcon from "@mui/icons-material/CloudDoneOutlined";
import CloudSyncOutlinedIcon from "@mui/icons-material/CloudSyncOutlined";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import ArrowDropDownRoundedIcon from "@mui/icons-material/ArrowDropDownRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import Tooltip from "@mui/material/Tooltip";
import Snackbar from "@mui/material/Snackbar";
import { UserAvatar } from "@/features/auth";
import {
  usePresentation,
  useRenamePresentation,
  useSetVisibility,
} from "@/features/presentations";
import {
  useActiveSlide,
  useEditorActions,
  useEditorDeckId,
  useEditorState,
} from "../state/EditorContext";
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

function SaveStatusIndicator() {
  const { saveState } = useEditorState();
  const { icon, tooltip, color } = useMemo(() => {
    switch (saveState) {
      case "saving":
        return {
          icon: <CloudSyncOutlinedIcon fontSize="small" />,
          tooltip: "Saving…",
          color: "#5f6368",
        };
      case "saved":
        return {
          icon: <CloudDoneOutlinedIcon fontSize="small" />,
          tooltip: "All changes saved",
          color: "#1a73e8",
        };
      case "offline":
        return {
          icon: <CloudOffOutlinedIcon fontSize="small" />,
          tooltip: "Couldn't save — check your connection",
          color: "#d93025",
        };
      case "idle":
      default:
        return {
          icon: <CloudDoneOutlinedIcon fontSize="small" />,
          tooltip: "All changes saved to your account",
          color: "#5f6368",
        };
    }
  }, [saveState]);

  return (
    <Tooltip title={tooltip} placement="bottom">
      <span className={styles.iconButton} aria-label={tooltip} style={{ color }}>
        {icon}
      </span>
    </Tooltip>
  );
}

function ShareButton() {
  const deckId = useEditorDeckId();
  const { data } = usePresentation(deckId);
  const setVisibility = useSetVisibility(deckId);
  const [open, setOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  const isPublic = !!data?.is_public;

  const toggleVisibility = useCallback(() => {
    setVisibility.mutate(!isPublic);
  }, [isPublic, setVisibility]);

  const copyLink = useCallback(async () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/present/${deckId}`;
    try {
      await navigator.clipboard.writeText(url);
      setToastOpen(true);
    } catch {
      // Silent fallback — user can copy URL manually.
    }
    setOpen(false);
  }, [deckId]);

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
        <button
          className={styles.splitLabel}
          aria-label="Share"
          onClick={() => setOpen((v) => !v)}
        >
          {isPublic ? (
            <PublicOutlinedIcon fontSize="small" />
          ) : (
            <LockOutlinedIcon fontSize="small" />
          )}
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
            onClick={toggleVisibility}
            disabled={setVisibility.isPending}
          >
            {isPublic ? (
              <LockOutlinedIcon fontSize="small" />
            ) : (
              <PublicOutlinedIcon fontSize="small" />
            )}
            <span>
              {isPublic ? "Restrict access" : "Anyone with the link can view"}
            </span>
          </button>
          {isPublic && (
            <button
              className={styles.shareDropdownItem}
              onClick={copyLink}
              title="Copy public slideshow link"
            >
              <LinkRoundedIcon fontSize="small" />
              <span>Copy link</span>
            </button>
          )}
        </div>
      )}
      <Snackbar
        open={toastOpen}
        autoHideDuration={2000}
        onClose={() => setToastOpen(false)}
        message="Link copied to clipboard"
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </div>
  );
}

export function TopBar() {
  const deckId = useEditorDeckId();
  const { deck } = useEditorState();
  const { renameDeck, startPresenting } = useEditorActions();
  const renameMutation = useRenamePresentation();
  const slide = useActiveSlide();

  const handleBlur = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      renameMutation.mutate({ id: deckId, title: trimmed });
    },
    [renameMutation, deckId],
  );

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
              onBlur={(e) => handleBlur(e.target.value)}
              aria-label="Presentation title"
            />
            <button className={styles.iconButton} title="Star" aria-label="Star">
              <StarBorderRoundedIcon fontSize="small" />
            </button>
            <button className={styles.iconButton} title="Move" aria-label="Move">
              <DriveFileMoveOutlinedIcon fontSize="small" />
            </button>
            <SaveStatusIndicator />
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
          <button
            className={styles.splitLabel}
            aria-label="Start slideshow"
            title="Start slideshow (Cmd+Enter)"
            onClick={() => startPresenting(slide?.id)}
          >
            <PlayArrowRoundedIcon fontSize="small" />
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
