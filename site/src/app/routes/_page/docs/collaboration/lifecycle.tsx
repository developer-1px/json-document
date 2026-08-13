import { createFileRoute } from "@tanstack/react-router";
import { CollaborationLifecycleRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/collaboration/lifecycle")({
  component: CollaborationLifecycleRoute,
});
