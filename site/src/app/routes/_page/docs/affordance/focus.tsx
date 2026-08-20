import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/affordance/focus")({
  component: function AffordanceFocusDocsRoute() {
    return <DocsRoute pageId="affordanceFocus" />;
  },
});
