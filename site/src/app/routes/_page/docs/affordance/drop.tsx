import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/affordance/drop")({
  component: function AffordanceDropDocsRoute() {
    return <DocsRoute pageId="affordanceDrop" />;
  },
});
