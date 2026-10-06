import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/api/sheet-document")({
  component: function PackageApiReferenceRoute() {
    return <DocsRoute pageId="sheetDocumentApi" />;
  },
});
