import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/affordance/hover")({
  component: function AffordanceHoverDocsRoute() {
    return <DocsRoute pageId="affordanceHover" />;
  },
});
