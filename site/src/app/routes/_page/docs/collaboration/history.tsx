import { createFileRoute } from "@tanstack/react-router";
import { CollaborationHistoryRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/collaboration/history")({
  component: CollaborationHistoryRoute,
});
