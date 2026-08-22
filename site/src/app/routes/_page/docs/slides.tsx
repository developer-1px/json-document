import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/slides")({
  component: function SlidesDocsRoute() {
    return <DocsRoute pageId="slides" />;
  },
});
