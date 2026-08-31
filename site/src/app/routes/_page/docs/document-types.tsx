import { createFileRoute } from "@tanstack/react-router";
import { DocumentTypesDocsRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/document-types")({
  component: DocumentTypesDocsRoute,
});
