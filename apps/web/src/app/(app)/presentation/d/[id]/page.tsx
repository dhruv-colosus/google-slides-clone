import { EditorShell } from "@/features/editor/components/EditorShell";
import { EditorProvider } from "@/features/editor/state/EditorContext";
import { createMockDeck } from "@/features/editor/model/mockDeck";

type Params = { params: Promise<{ id: string }> };

export default async function PresentationEditorPage({ params }: Params) {
  const { id } = await params;
  // v0: every deck id gets a fresh mock deck. In P7 this becomes
  // `loadFromIndexedDB(id)` and in P10 `HybridProvider.load(id)`.
  const deck = createMockDeck(id);

  return (
    <EditorProvider initialDeck={deck}>
      <EditorShell />
    </EditorProvider>
  );
}
