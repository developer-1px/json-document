import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/affordance/delete")({
  component: function AffordanceDeleteDocsRoute() {
    return <DocsRoute pageId="affordanceDelete" />;
  },
});
