import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/affordance/drag")({
  component: function AffordanceDragDocsRoute() {
    return <DocsRoute pageId="affordanceDrag" />;
  },
});
