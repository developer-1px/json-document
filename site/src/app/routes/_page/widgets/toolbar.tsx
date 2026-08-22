import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { ToolbarWidgetRoute } from "../../../../routes/widgets/ToolbarWidgetRoute";

export const Route = createFileRoute("/_page/widgets/toolbar")({
  component: ToolbarWidgetRoute,
  ...defineDemo({ source: "routes/widgets/ToolbarWidgetRoute.tsx" }),
});
