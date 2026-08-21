import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { DocumentDemoRoute } from "../../../../routes/document-demo/DocumentDemoRoute";

export const Route = createFileRoute("/_page/demo/")({
  component: DocumentDemoRoute,
  ...defineDemo({ source: "routes/document-demo/DocumentDemoRoute.tsx" }),
});
