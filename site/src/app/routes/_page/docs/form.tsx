import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/form")({
  component: function FormDocsRoute() {
    return <DocsRoute pageId="form" />;
  },
});
