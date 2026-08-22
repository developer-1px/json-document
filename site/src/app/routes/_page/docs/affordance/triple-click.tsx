import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/affordance/triple-click")({
  component: function AffordanceTripleClickDocsRoute() {
    return <DocsRoute pageId="affordanceTripleClick" />;
  },
});
