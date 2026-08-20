import { createFileRoute } from "@tanstack/react-router";
import { GridWidgetRoute } from "../../../../routes/widgets/GridWidgetRoute";

export const Route = createFileRoute("/_page/widgets/grid")({
  component: GridWidgetRoute,
});
