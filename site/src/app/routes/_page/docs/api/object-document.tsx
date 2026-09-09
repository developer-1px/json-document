import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/api/object-document")({
  component: function ObjectDocumentApiReferenceRoute() { return <DocsRoute pageId="objectDocumentApi" />; },
});
