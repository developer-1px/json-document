import { createFileRoute } from "@tanstack/react-router";
import { CanvasDemoRoute } from "../../../../routes/canvas-demo/CanvasDemoRoute";

export const Route = createFileRoute("/_page/demo/canvas")({
  component: CanvasDemoRoute,
});
