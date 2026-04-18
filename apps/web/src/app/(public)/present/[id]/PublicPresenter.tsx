"use client";

import { useLayoutEffect } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";

import { PresenterShell } from "@/features/editor/components/PresenterShell";
import {
  EditorProvider,
  useEditorActions,
} from "@/features/editor/state/EditorContext";
import { usePublicPresentation } from "@/features/presentations";

const centeredSx = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 2,
  bgcolor: "#000",
  color: "#eee",
  px: 3,
  textAlign: "center",
} as const;

function AutoStartPresenter() {
  const { startPresenting } = useEditorActions();
  useLayoutEffect(() => {
    startPresenting();
  }, [startPresenting]);
  return <PresenterShell />;
}

export function PublicPresenter({ deckId }: { deckId: string }) {
  const { data, isLoading, isError } = usePublicPresentation(deckId);

  if (isLoading) {
    return (
      <Box sx={centeredSx}>
        <CircularProgress size={32} sx={{ color: "#eee" }} />
        <Typography variant="body2">Loading presentation…</Typography>
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Box sx={centeredSx}>
        <Typography variant="h6">Presentation unavailable</Typography>
        <Typography variant="body2">
          This presentation doesn&apos;t exist or hasn&apos;t been shared publicly.
        </Typography>
      </Box>
    );
  }

  return (
    <EditorProvider deckId={deckId} initialDeck={data.content}>
      <AutoStartPresenter />
    </EditorProvider>
  );
}
