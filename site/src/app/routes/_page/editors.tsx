import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/editors")({
  component: function EditorsDocsRoute() {
    return <DocsRoute pageId="editors" />;
  },
});
