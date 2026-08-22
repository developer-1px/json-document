import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/composer")({
  component: function ComposerDocsRoute() {
    return <DocsRoute pageId="composer" />;
  },
});
