import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { GridWidgetRoute } from "../../../../routes/widgets/GridWidgetRoute";

export const Route = createFileRoute("/_page/widgets/grid")({
  ...defineDemo({ component: GridWidgetRoute, source: "routes/widgets/GridWidgetRoute.tsx" }),
});
