import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/ui-primitives")({
  component: function UIPrimitivesDocsRoute() {
    return <DocsRoute pageId="uiPrimitives" />;
  },
});
