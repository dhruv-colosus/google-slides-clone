"use client";

/**
 * Editor store.
 *
 * Structural deck state is owned by a Yjs-backed DocProvider. Ephemeral UI
 * state (selection, tool, zoom, save indicator) stays in a small useReducer.
 * Components subscribe to Yjs updates via useSyncExternalStore so no useEffect
 * is needed for the doc <-> React bridge.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type ReactNode,
} from "react";
import type { Editor } from "@tiptap/react";
import type {
  Deck,
  ElementId,
  ShapeKind,
  SlideElement,
  SlideId,
  TextBlock,
  ToolMode,
  Selection,
} from "../model/types";
import {
  InMemoryDocProvider,
  type DocProvider,
  type ElementPatch,
  type ZDirection,
} from "../yjs/provider";
import { createMockDeck } from "../model/mockDeck";

export type ZoomMode = "fit" | number;

export type UiState = {
  selection: Selection;
  tool: ToolMode;
  pendingShapeKind: ShapeKind | null;
  zoom: ZoomMode;
  editingElementId: ElementId | null;
  croppingElementId: ElementId | null;
  saveState: "idle" | "saving" | "saved" | "offline";
};

export type EditorState = UiState & { deck: Deck };

type UiAction =
  | { type: "select"; slideId: SlideId | null; elementIds?: ElementId[] }
  | { type: "setActiveSlide"; slideId: SlideId }
  | { type: "setTool"; tool: ToolMode; pendingShapeKind?: ShapeKind | null }
  | { type: "setPendingShapeKind"; kind: ShapeKind | null }
  | { type: "setZoom"; zoom: ZoomMode }
  | { type: "startEditing"; elementId: ElementId }
  | { type: "stopEditing" }
  | { type: "startCropping"; elementId: ElementId }
  | { type: "stopCropping" }
  | { type: "setSaveState"; state: UiState["saveState"] };

function uiReducer(state: UiState, action: UiAction): UiState {
  switch (action.type) {
    case "select": {
      const nextIds = action.elementIds ?? [];
      const editingStillValid =
        state.editingElementId &&
        nextIds.length === 1 &&
        nextIds[0] === state.editingElementId;
      const croppingStillValid =
        state.croppingElementId &&
        nextIds.length === 1 &&
        nextIds[0] === state.croppingElementId;
      return {
        ...state,
        selection: {
          slideId: action.slideId ?? state.selection.slideId,
          elementIds: nextIds,
        },
        editingElementId: editingStillValid ? state.editingElementId : null,
        croppingElementId: croppingStillValid ? state.croppingElementId : null,
      };
    }
    case "setActiveSlide":
      return {
        ...state,
        selection: { slideId: action.slideId, elementIds: [] },
        editingElementId: null,
        croppingElementId: null,
      };
    case "setTool":
      return {
        ...state,
        tool: action.tool,
        pendingShapeKind:
          action.pendingShapeKind !== undefined
            ? action.pendingShapeKind
            : action.tool === "shape" || action.tool === "line"
              ? state.pendingShapeKind
              : null,
        editingElementId: null,
        croppingElementId: null,
      };
    case "setPendingShapeKind":
      return { ...state, pendingShapeKind: action.kind };
    case "setZoom":
      return { ...state, zoom: action.zoom };
    case "startEditing":
      return {
        ...state,
        editingElementId: action.elementId,
        croppingElementId: null,
        selection: {
          slideId: state.selection.slideId,
          elementIds: [action.elementId],
        },
      };
    case "stopEditing":
      return { ...state, editingElementId: null };
    case "startCropping":
      return {
        ...state,
        croppingElementId: action.elementId,
        editingElementId: null,
        selection: {
          slideId: state.selection.slideId,
          elementIds: [action.elementId],
        },
      };
    case "stopCropping":
      return { ...state, croppingElementId: null };
    case "setSaveState":
      return { ...state, saveState: action.state };
    default:
      return state;
  }
}

type EditorContextValue = {
  ui: UiState;
  uiDispatch: Dispatch<UiAction>;
  provider: DocProvider;
  activeEditor: Editor | null;
  setActiveEditorFor: (elementId: ElementId, editor: Editor | null) => void;
  clearActiveEditor: (elementId: ElementId) => void;
};

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({
  deckId,
  children,
}: {
  deckId: string;
  children: ReactNode;
}) {
  const [provider, setProvider] = useState<DocProvider>(
    () => new InMemoryDocProvider(createMockDeck(deckId)),
  );

  const lastDeckIdRef = useRef(deckId);
  if (lastDeckIdRef.current !== deckId) {
    lastDeckIdRef.current = deckId;
    provider.destroy();
    setProvider(new InMemoryDocProvider(createMockDeck(deckId)));
  }

  const destroyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (destroyTimerRef.current) {
      clearTimeout(destroyTimerRef.current);
      destroyTimerRef.current = null;
    }
    return () => {
      destroyTimerRef.current = setTimeout(() => {
        provider.destroy();
      }, 0);
    };
  }, [provider]);

  const [ui, uiDispatch] = useReducer(uiReducer, undefined, () => ({
    selection: { slideId: provider.readDeck().slides[0]?.id ?? null, elementIds: [] },
    tool: "select" as ToolMode,
    pendingShapeKind: null,
    zoom: "fit" as ZoomMode,
    editingElementId: null,
    croppingElementId: null,
    saveState: "idle" as const,
  }));

  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const activeEditorOwnerRef = useRef<ElementId | null>(null);

  const setActiveEditorFor = useCallback(
    (elementId: ElementId, editor: Editor | null) => {
      if (editor) {
        activeEditorOwnerRef.current = elementId;
        setActiveEditor(editor);
      } else if (activeEditorOwnerRef.current === elementId) {
        activeEditorOwnerRef.current = null;
        setActiveEditor(null);
      }
    },
    [],
  );

  const clearActiveEditor = useCallback((elementId: ElementId) => {
    if (activeEditorOwnerRef.current === elementId) {
      activeEditorOwnerRef.current = null;
      setActiveEditor(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      ui,
      uiDispatch,
      provider,
      activeEditor,
      setActiveEditorFor,
      clearActiveEditor,
    }),
    [ui, provider, activeEditor, setActiveEditorFor, clearActiveEditor],
  );
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used inside <EditorProvider>");
  return ctx;
}

export function useDocProvider(): DocProvider {
  return useEditor().provider;
}

function useDeck(): Deck {
  const { provider } = useEditor();
  useSyncExternalStore(provider.subscribe, provider.getVersion, provider.getVersion);
  return provider.readDeck();
}

export function useEditorState(): EditorState {
  const { ui } = useEditor();
  const deck = useDeck();
  return { ...ui, deck };
}

export function useActiveSlide() {
  const deck = useDeck();
  const { ui } = useEditor();
  return deck.slides.find((s) => s.id === ui.selection.slideId) ?? deck.slides[0] ?? null;
}

export function useUndoState() {
  const { provider } = useEditor();
  useSyncExternalStore(provider.subscribe, provider.getVersion, provider.getVersion);
  return { canUndo: provider.canUndo(), canRedo: provider.canRedo() };
}

export function useActiveEditor(): Editor | null {
  return useEditor().activeEditor;
}

export function useActiveEditorRegistry() {
  const { setActiveEditorFor, clearActiveEditor } = useEditor();
  return {
    register: setActiveEditorFor,
    unregister: clearActiveEditor,
  };
}

export function useEditorActions() {
  const { ui, uiDispatch, provider } = useEditor();
  const activeSlideId = ui.selection.slideId;

  const selectSlide = useCallback(
    (slideId: SlideId) => uiDispatch({ type: "setActiveSlide", slideId }),
    [uiDispatch],
  );
  const selectElements = useCallback(
    (slideId: SlideId | null, elementIds: ElementId[]) =>
      uiDispatch({ type: "select", slideId, elementIds }),
    [uiDispatch],
  );
  const setTool = useCallback(
    (tool: ToolMode, pendingShapeKind?: ShapeKind | null) =>
      uiDispatch({ type: "setTool", tool, pendingShapeKind }),
    [uiDispatch],
  );
  const setPendingShapeKind = useCallback(
    (kind: ShapeKind | null) => uiDispatch({ type: "setPendingShapeKind", kind }),
    [uiDispatch],
  );
  const setZoom = useCallback(
    (zoom: ZoomMode) => uiDispatch({ type: "setZoom", zoom }),
    [uiDispatch],
  );

  const renameDeck = useCallback(
    (title: string) => provider.renameDeck(title),
    [provider],
  );

  const addSlide = useCallback(() => {
    const newId = provider.addSlide(activeSlideId);
    uiDispatch({ type: "setActiveSlide", slideId: newId });
  }, [provider, uiDispatch, activeSlideId]);

  const deleteSlide = useCallback(
    (slideId: SlideId) => {
      const deck = provider.readDeck();
      const idx = deck.slides.findIndex((s) => s.id === slideId);
      provider.deleteSlide(slideId);
      const afterDeck = provider.readDeck();
      if (!afterDeck.slides.find((s) => s.id === slideId)) {
        const next = afterDeck.slides[Math.min(idx, afterDeck.slides.length - 1)];
        if (next) uiDispatch({ type: "setActiveSlide", slideId: next.id });
      }
    },
    [provider, uiDispatch],
  );

  const duplicateSlide = useCallback(
    (slideId: SlideId) => {
      const newId = provider.duplicateSlide(slideId);
      if (newId) uiDispatch({ type: "setActiveSlide", slideId: newId });
    },
    [provider, uiDispatch],
  );

  const reorderSlides = useCallback(
    (fromIndex: number, toIndex: number) =>
      provider.reorderSlides(fromIndex, toIndex),
    [provider],
  );

  const addElement = useCallback(
    (slideId: SlideId, el: SlideElement) => {
      provider.addElement(slideId, el);
      uiDispatch({ type: "select", slideId, elementIds: [el.id] });
    },
    [provider, uiDispatch],
  );

  const updateElement = useCallback(
    (slideId: SlideId, elementId: ElementId, patch: ElementPatch) =>
      provider.updateElement(slideId, elementId, patch),
    [provider],
  );

  const updateElements = useCallback(
    (
      slideId: SlideId,
      updates: Array<{ id: ElementId; patch: ElementPatch }>,
    ) => provider.updateElements(slideId, updates),
    [provider],
  );

  const deleteElement = useCallback(
    (slideId: SlideId, elementId: ElementId) => {
      provider.deleteElement(slideId, elementId);
      uiDispatch({ type: "select", slideId, elementIds: [] });
    },
    [provider, uiDispatch],
  );

  const duplicateElement = useCallback(
    (slideId: SlideId, elementId: ElementId) => {
      const newId = provider.duplicateElement(slideId, elementId);
      if (newId) uiDispatch({ type: "select", slideId, elementIds: [newId] });
    },
    [provider, uiDispatch],
  );

  const setElementZ = useCallback(
    (slideId: SlideId, elementId: ElementId, direction: ZDirection) =>
      provider.setElementZ(slideId, elementId, direction),
    [provider],
  );

  const undo = useCallback(() => provider.undo(), [provider]);
  const redo = useCallback(() => provider.redo(), [provider]);

  const startEditing = useCallback(
    (elementId: ElementId) => uiDispatch({ type: "startEditing", elementId }),
    [uiDispatch],
  );
  const stopEditing = useCallback(
    () => uiDispatch({ type: "stopEditing" }),
    [uiDispatch],
  );
  const startCropping = useCallback(
    (elementId: ElementId) => uiDispatch({ type: "startCropping", elementId }),
    [uiDispatch],
  );
  const stopCropping = useCallback(
    () => uiDispatch({ type: "stopCropping" }),
    [uiDispatch],
  );

  const updateTextBlock = useCallback(
    (slideId: SlideId, elementId: ElementId, partial: Partial<TextBlock>) => {
      const deck = provider.readDeck();
      const slide = deck.slides.find((s) => s.id === slideId);
      const el = slide?.elements.find((e) => e.id === elementId);
      if (!el || el.type !== "text") return;
      provider.updateElement(slideId, elementId, {
        text: { ...el.text, ...partial },
      });
    },
    [provider],
  );

  return {
    selectSlide,
    selectElements,
    setTool,
    setPendingShapeKind,
    setZoom,
    renameDeck,
    addSlide,
    deleteSlide,
    duplicateSlide,
    reorderSlides,
    addElement,
    updateElement,
    updateElements,
    deleteElement,
    duplicateElement,
    setElementZ,
    undo,
    redo,
    startEditing,
    stopEditing,
    startCropping,
    stopCropping,
    updateTextBlock,
  };
}

