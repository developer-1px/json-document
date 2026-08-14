import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/collaboration/history")({
  component: function CollaborationHistoryDocsRoute() {
    return <DocsRoute pageId="collaborationHistory" />;
  },
});
