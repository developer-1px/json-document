import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/affordance/contextual")({
  component: function AffordanceContextualDocsRoute() {
    return <DocsRoute pageId="affordanceContextual" />;
  },
});
