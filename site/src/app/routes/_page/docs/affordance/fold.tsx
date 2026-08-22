import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/affordance/fold")({
  component: function AffordanceFoldDocsRoute() {
    return <DocsRoute pageId="affordanceFold" />;
  },
});
