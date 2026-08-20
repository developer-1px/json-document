import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/affordance/context-menu")({
  component: function AffordanceContextMenuDocsRoute() {
    return <DocsRoute pageId="affordanceContextMenu" />;
  },
});
