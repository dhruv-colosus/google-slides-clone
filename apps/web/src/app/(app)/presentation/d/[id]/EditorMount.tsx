"use client";

import { EditorShell } from "@/features/editor/components/EditorShell";
import { EditorProvider } from "@/features/editor/state/EditorContext";

export default function EditorMount({ deckId }: { deckId: string }) {
  return (
    <EditorProvider deckId={deckId}>
      <EditorShell />
    </EditorProvider>
  );
}
