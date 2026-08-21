import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { CanvasDemoRoute } from "../../../../routes/canvas-demo/CanvasDemoRoute";

export const Route = createFileRoute("/_page/demo/canvas")({
  ...defineDemo({ component: CanvasDemoRoute, source: "routes/canvas-demo/CanvasDemoRoute.tsx" }),
});
