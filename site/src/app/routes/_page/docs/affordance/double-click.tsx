import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/affordance/double-click")({
  component: function AffordanceDoubleClickDocsRoute() {
    return <DocsRoute pageId="affordanceDoubleClick" />;
  },
});
