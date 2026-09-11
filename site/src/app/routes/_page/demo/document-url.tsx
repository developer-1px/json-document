import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { DocumentURLRoute } from "../../../../routes/document-url/DocumentURLRoute";

export const Route = createFileRoute("/_page/demo/document-url")({
  component: DocumentURLRoute,
  ...defineDemo({source:"routes/document-url/DocumentURLRoute.tsx"}),
});
