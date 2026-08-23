import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { AnnotationDemoRoute } from "../../../../routes/annotation-demo/AnnotationDemoRoute";

export const Route = createFileRoute("/_page/demo/annotation")({
  component: AnnotationDemoRoute,
  ...defineDemo({ source: "routes/annotation-demo/AnnotationDemoRoute.tsx" }),
});
