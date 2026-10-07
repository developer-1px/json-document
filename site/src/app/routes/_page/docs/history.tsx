import { createFileRoute } from "@tanstack/react-router";
import { HistoryDocsRoute } from "../../../../routes/docs/ArchitectureRoute";

export const Route = createFileRoute("/_page/docs/history")({
  component: HistoryDocsRoute,
});
