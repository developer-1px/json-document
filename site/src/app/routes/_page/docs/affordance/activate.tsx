import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/affordance/activate")({
  component: function AffordanceActivateDocsRoute() {
    return <DocsRoute pageId="affordanceActivate" />;
  },
});
