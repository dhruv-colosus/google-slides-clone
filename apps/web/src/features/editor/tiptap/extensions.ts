/**
 * Shared Tiptap extension builder for text elements.
 *
 * StarterKit's History is disabled because y-prosemirror + our top-level
 * Y.UndoManager own the undo stack. Collaboration binds the editor to a
 * Y.XmlFragment that lives inside the element's Y.Map.
 */

import { StarterKit } from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import {
  TextStyle,
  Color,
  FontFamily,
  FontSize,
  LineHeight,
} from "@tiptap/extension-text-style";
import { Link } from "@tiptap/extension-link";
import { Highlight } from "@tiptap/extension-highlight";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Collaboration } from "@tiptap/extension-collaboration";
import type * as Y from "yjs";
import { getSchema, type AnyExtension } from "@tiptap/core";
import type { Schema } from "@tiptap/pm/model";

export type TiptapExtensionOptions = {
  fragment: Y.XmlFragment;
  placeholder?: string;
};

function buildSchemaExtensions(): AnyExtension[] {
  return [
    StarterKit.configure({
      undoRedo: false,
      link: false,
    }),
    Underline,
    TextStyle,
    Color,
    FontFamily,
    FontSize,
    LineHeight,
    TextAlign.configure({
      types: ["heading", "paragraph"],
      alignments: ["left", "center", "right", "justify"],
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
    }),
    Highlight.configure({ multicolor: true }),
  ];
}

export function buildTextExtensions({
  fragment,
  placeholder,
}: TiptapExtensionOptions): AnyExtension[] {
  return [
    ...buildSchemaExtensions(),
    Placeholder.configure({
      placeholder: placeholder ?? "",
      emptyEditorClass: "is-editor-empty",
    }),
    Collaboration.configure({
      fragment,
    }),
  ];
}

let _textSchema: Schema | null = null;

export function getTextSchema(): Schema {
  if (_textSchema) return _textSchema;
  _textSchema = getSchema(buildSchemaExtensions());
  return _textSchema;
}

export const FONT_FAMILIES = [
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Manrope", value: "Manrope, sans-serif" },
  { label: "Google Sans", value: "Google Sans, sans-serif" },
  { label: "Roboto", value: "Roboto, sans-serif" },
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "Times New Roman, serif" },
  { label: "Courier New", value: "Courier New, monospace" },
] as const;

export const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96];
