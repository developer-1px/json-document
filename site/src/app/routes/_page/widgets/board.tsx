import { createFileRoute } from "@tanstack/react-router";
import { BoardWidgetRoute } from "../../../../routes/widgets/BoardWidgetRoute";

export const Route = createFileRoute("/_page/widgets/board")({
  component: BoardWidgetRoute,
});
