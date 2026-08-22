import { createFileRoute } from "@tanstack/react-router";
import { CanvasWidgetRoute } from "../../../../routes/widgets/CanvasWidgetRoute";

export const Route = createFileRoute("/_page/widgets/canvas")({
  component: CanvasWidgetRoute,
});
