import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/affordance/select")({
  component: function AffordanceSelectDocsRoute() {
    return <DocsRoute pageId="affordanceSelect" />;
  },
});
