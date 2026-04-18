"use client";

import { useEffect, useMemo, useRef } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { buildTextExtensions } from "../tiptap/extensions";
import { useDocProvider, useActiveEditorRegistry } from "../state/EditorContext";
import type { ElementId, SlideId, TextElement } from "../model/types";
import { resolveColor, resolveFontFamily, type Theme } from "../themes";
import styles from "../editor.module.css";

type DataProps = {
  "data-element-id": string;
  "data-selected"?: "true";
};

type TextElementEditorProps = {
  element: TextElement;
  slideId: SlideId;
  theme: Theme;
  interactive: boolean;
  selected: boolean;
  editing: boolean;
  onStartEditing?: (elementId: ElementId) => void;
  onMouseDown?: (e: ReactMouseEvent, elementId: ElementId) => void;
  onContextMenu?: (e: ReactMouseEvent, elementId: ElementId) => void;
  dataProps?: DataProps;
};

export function TextElementEditor({
  element,
  slideId,
  theme,
  interactive,
  selected,
  editing,
  onStartEditing,
  onMouseDown,
  onContextMenu,
  dataProps,
}: TextElementEditorProps) {
  const provider = useDocProvider();
  const { register, unregister } = useActiveEditorRegistry();

  const fragment = useMemo(
    () => provider.getTextFragment(slideId, element.id),
    [provider, slideId, element.id],
  );

  const extensions = useMemo(() => {
    if (!fragment) return [];
    return buildTextExtensions({
      fragment,
      placeholder: element.text.placeholder,
    });
  }, [fragment, element.text.placeholder]);

  const editor = useEditor(
    {
      extensions,
      editable: editing,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: styles.tiptapContent,
        },
      },
    },
    [fragment],
  );

  const editorRef = useRef<Editor | null>(null);
  editorRef.current = editor;

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editing);
    if (editing) {
      editor.commands.focus("end");
    }
  }, [editor, editing]);

  useEffect(() => {
    if (!editor || !interactive) return;
    if (selected) {
      register(element.id, editor);
      return () => unregister(element.id);
    }
  }, [editor, selected, element.id, register, unregister, interactive]);

  const handleMouseDown = (e: ReactMouseEvent) => {
    if (!interactive) return;
    if (editing) {
      e.stopPropagation();
      return;
    }
    onMouseDown?.(e, element.id);
  };

  const handleDoubleClick = (e: ReactMouseEvent) => {
    if (!interactive) return;
    e.stopPropagation();
    onStartEditing?.(element.id);
  };

  const handleContextMenu = (e: ReactMouseEvent) => {
    if (!interactive) return;
    onContextMenu?.(e, element.id);
  };

  const { text } = element;
  const align = text.align ?? "left";

  const style: React.CSSProperties = {
    position: "absolute",
    left: element.x,
    top: element.y,
    width: element.w,
    height: element.h,
    textAlign: align,
    fontSize: text.fontSize,
    color: resolveColor(text.color, theme, theme.colors.body),
    fontFamily: resolveFontFamily(text.fontFamily, theme),
    lineHeight: text.lineHeight,
    display: "flex",
    alignItems: "center",
    justifyContent:
      align === "center"
        ? "center"
        : align === "right"
          ? "flex-end"
          : "flex-start",
    cursor: interactive ? (editing ? "text" : "move") : undefined,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    userSelect: editing ? "text" : "none",
  };

  return (
    <div
      {...dataProps}
      className={`${styles.textElement} ${interactive && !editing ? styles.placeholderFrame : ""} ${
        editing ? styles.textElementEditing : ""
      }`}
      style={style}
      data-editing={editing ? "true" : undefined}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      <EditorContent editor={editor} className={styles.tiptapWrap} />
    </div>
  );
}
