import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/database")({
  component: function DatabaseDocsRoute() {
    return <DocsRoute pageId="database" />;
  },
});
