import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/affordance/handles")({
  component: function AffordanceHandlesDocsRoute() {
    return <DocsRoute pageId="affordanceHandles" />;
  },
});
