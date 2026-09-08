import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/animation")({
  component: function AnimationDocsRoute() {
    return <DocsRoute pageId="animation" />;
  },
});
