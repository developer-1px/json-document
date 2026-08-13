import { createFileRoute } from "@tanstack/react-router";
import { CollaborationOverviewRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/collaboration/")({
  component: CollaborationOverviewRoute,
});
