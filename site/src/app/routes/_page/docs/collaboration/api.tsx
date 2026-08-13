import { createFileRoute } from "@tanstack/react-router";
import { CollaborationApiRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/collaboration/api")({
  component: CollaborationApiRoute,
});
