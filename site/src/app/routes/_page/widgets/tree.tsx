import { createFileRoute } from "@tanstack/react-router";
import { TreeWidgetRoute } from "../../../../routes/widgets/TreeWidgetRoute";

export const Route = createFileRoute("/_page/widgets/tree")({
  component: TreeWidgetRoute,
});
