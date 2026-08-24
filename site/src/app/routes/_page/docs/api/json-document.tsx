import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/api/json-document")({
  component: function PackageApiReferenceRoute() {
    return <DocsRoute pageId="jsonDocumentApi" />;
  },
});
