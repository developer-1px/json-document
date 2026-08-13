import { createFileRoute } from "@tanstack/react-router";
import { HistoryDocsRoute } from "../../../../routes/docs/ConceptsRoute";

export const Route = createFileRoute("/_page/docs/history")({
  component: HistoryDocsRoute,
});
