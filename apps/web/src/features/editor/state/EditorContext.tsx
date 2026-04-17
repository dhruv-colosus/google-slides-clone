"use client";

/**
 * Editor store (v0).
 *
 * Deliberately a small React context over useReducer. Every mutation is a
 * typed action, so replacing the reducer body with Yjs mutations in P3
 * (and later hoisting into Zustand per the plan) is mechanical — the
 * components consume selectors and dispatch actions, they do not touch
 * state shape directly.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import type { Deck, ElementId, SlideId, ToolMode, Selection } from "../model/types";

export type ZoomMode = "fit" | number; // number = absolute percentage, e.g. 100

export type EditorState = {
  deck: Deck;
  selection: Selection;
  tool: ToolMode;
  zoom: ZoomMode;
  saveState: "idle" | "saving" | "saved" | "offline";
};

export type EditorAction =
  | { type: "select"; slideId: SlideId | null; elementIds?: ElementId[] }
  | { type: "setActiveSlide"; slideId: SlideId }
  | { type: "setTool"; tool: ToolMode }
  | { type: "setZoom"; zoom: ZoomMode }
  | { type: "renameDeck"; title: string }
  | { type: "addSlide" }
  | { type: "deleteSlide"; slideId: SlideId };

function reducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "select":
      return {
        ...state,
        selection: {
          slideId: action.slideId ?? state.selection.slideId,
          elementIds: action.elementIds ?? [],
        },
      };
    case "setActiveSlide":
      return {
        ...state,
        selection: { slideId: action.slideId, elementIds: [] },
      };
    case "setTool":
      return { ...state, tool: action.tool };
    case "setZoom":
      return { ...state, zoom: action.zoom };
    case "renameDeck":
      return {
        ...state,
        deck: { ...state.deck, meta: { ...state.deck.meta, title: action.title } },
      };
    case "addSlide": {
      const nextId = `slide-${state.deck.slides.length + 1}`;
      const blank = {
        id: nextId,
        layoutId: "blank",
        background: { kind: "solid", color: "#ffffff" } as const,
        elements: [],
      };
      return {
        ...state,
        deck: { ...state.deck, slides: [...state.deck.slides, blank] },
        selection: { slideId: nextId, elementIds: [] },
      };
    }
    case "deleteSlide": {
      if (state.deck.slides.length <= 1) return state;
      const remaining = state.deck.slides.filter((s) => s.id !== action.slideId);
      const nextActive =
        state.selection.slideId === action.slideId
          ? remaining[0].id
          : state.selection.slideId;
      return {
        ...state,
        deck: { ...state.deck, slides: remaining },
        selection: { slideId: nextActive, elementIds: [] },
      };
    }
    default:
      return state;
  }
}

type EditorContextValue = {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
};

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({
  initialDeck,
  children,
}: {
  initialDeck: Deck;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    deck: initialDeck,
    selection: { slideId: initialDeck.slides[0]?.id ?? null, elementIds: [] },
    tool: "select" as ToolMode,
    zoom: "fit" as ZoomMode,
    saveState: "idle" as const,
  }));

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used inside <EditorProvider>");
  return ctx;
}

export function useEditorState(): EditorState {
  return useEditor().state;
}

export function useEditorDispatch(): Dispatch<EditorAction> {
  return useEditor().dispatch;
}

export function useActiveSlide() {
  const { state } = useEditor();
  const { deck, selection } = state;
  return (
    deck.slides.find((s) => s.id === selection.slideId) ?? deck.slides[0] ?? null
  );
}

export function useEditorActions() {
  const dispatch = useEditorDispatch();
  return {
    selectSlide: useCallback(
      (slideId: SlideId) => dispatch({ type: "setActiveSlide", slideId }),
      [dispatch],
    ),
    selectElements: useCallback(
      (slideId: SlideId | null, elementIds: ElementId[]) =>
        dispatch({ type: "select", slideId, elementIds }),
      [dispatch],
    ),
    setTool: useCallback(
      (tool: ToolMode) => dispatch({ type: "setTool", tool }),
      [dispatch],
    ),
    setZoom: useCallback(
      (zoom: ZoomMode) => dispatch({ type: "setZoom", zoom }),
      [dispatch],
    ),
    renameDeck: useCallback(
      (title: string) => dispatch({ type: "renameDeck", title }),
      [dispatch],
    ),
    addSlide: useCallback(() => dispatch({ type: "addSlide" }), [dispatch]),
    deleteSlide: useCallback(
      (slideId: SlideId) => dispatch({ type: "deleteSlide", slideId }),
      [dispatch],
    ),
  };
}
