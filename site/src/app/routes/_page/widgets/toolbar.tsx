import { createFileRoute } from "@tanstack/react-router";
import { ToolbarWidgetRoute } from "../../../../routes/widgets/ToolbarWidgetRoute";

export const Route = createFileRoute("/_page/widgets/toolbar")({
  component: ToolbarWidgetRoute,
});
