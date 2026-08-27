import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { ViewportPositionDemoRoute } from "../../../../routes/viewport-position-demo/ViewportPositionDemoRoute";

export const Route = createFileRoute("/_page/demo/viewport")({
  component: ViewportPositionDemoRoute,
  ...defineDemo({ source: "routes/viewport-position-demo/ViewportPositionDemoRoute.tsx" }),
});
