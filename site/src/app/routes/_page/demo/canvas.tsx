import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { CanvasDemoRoute } from "../../../../routes/canvas-demo/CanvasDemoRoute";

export const Route = createFileRoute("/_page/demo/canvas")({
  component: CanvasDemoRoute,
  ...defineDemo({ source: "routes/canvas-demo/CanvasDemoRoute.tsx" }),
});
