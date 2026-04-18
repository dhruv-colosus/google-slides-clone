export type { DeckDetail, DeckSummary } from "./types";
export {
  presentationEndpoints,
  createPresentation,
  listPresentations,
  getPresentation,
  savePresentation,
  renamePresentation,
  setPresentationVisibility,
  deletePresentation,
  getPublicPresentation,
} from "./api";
export {
  PRESENTATIONS_QUERY_KEY,
  presentationKey,
  publicPresentationKey,
  usePresentations,
  usePresentation,
  usePublicPresentation,
  useCreatePresentation,
  useSavePresentation,
  useRenamePresentation,

  useSetVisibility,
  useDeletePresentation,
} from "./hooks";
