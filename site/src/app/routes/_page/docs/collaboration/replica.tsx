import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/collaboration/replica")({
  component: function CollaborationReplicaDocsRoute() {
    return <DocsRoute pageId="collaborationReplica" />;
  },
});
