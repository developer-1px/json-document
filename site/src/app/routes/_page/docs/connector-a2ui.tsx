import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/connector-a2ui")({
  component: function A2uiDocsRoute() {
    return <DocsRoute pageId="connectorA2ui" />;
  },
});
