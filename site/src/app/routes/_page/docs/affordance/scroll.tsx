import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/affordance/scroll")({
  component: function AffordanceScrollDocsRoute() {
    return <DocsRoute pageId="affordanceScroll" />;
  },
});
