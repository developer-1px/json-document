import { createFileRoute } from "@tanstack/react-router";
import { DocumentDemoRoute } from "../../../../routes/document-demo/DocumentDemoRoute";

export const Route = createFileRoute("/_page/demo/")({
  component: DocumentDemoRoute,
});
