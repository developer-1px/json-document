import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/collaboration/text/")({
  component: function CollaborationTextDocsRoute() {
    return <DocsRoute pageId="collaborationText" />;
  },
});
