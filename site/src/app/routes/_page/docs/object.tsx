import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/object")({
  component: function ObjectDocsRoute() {
    return <DocsRoute pageId="object" />;
  },
});
