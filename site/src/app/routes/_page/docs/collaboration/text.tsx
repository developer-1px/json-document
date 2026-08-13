import { createFileRoute } from "@tanstack/react-router";
import { CollaborationTextRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/collaboration/text")({
  component: CollaborationTextRoute,
});
