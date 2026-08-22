import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/affordance/snap")({
  component: function AffordanceSnapDocsRoute() {
    return <DocsRoute pageId="affordanceSnap" />;
  },
});
