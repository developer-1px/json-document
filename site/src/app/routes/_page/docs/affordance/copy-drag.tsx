import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/affordance/copy-drag")({
  component: function AffordanceCopyDragDocsRoute() {
    return <DocsRoute pageId="affordanceCopyDrag" />;
  },
});
