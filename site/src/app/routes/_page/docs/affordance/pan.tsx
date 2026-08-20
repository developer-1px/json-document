import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/affordance/pan")({
  component: function AffordancePanDocsRoute() {
    return <DocsRoute pageId="affordancePan" />;
  },
});
