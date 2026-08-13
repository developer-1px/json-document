import { createFileRoute } from "@tanstack/react-router";
import { CollaborationReplicaRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/collaboration/replica")({
  component: CollaborationReplicaRoute,
});
