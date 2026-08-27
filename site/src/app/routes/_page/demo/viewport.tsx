import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { ViewportInteractionDemoRoute } from "../../../../routes/viewport-demo/ViewportInteractionDemoRoute";

export const Route = createFileRoute("/_page/demo/viewport")({
  component: ViewportInteractionDemoRoute,
  ...defineDemo({ source: "routes/viewport-demo/ViewportInteractionDemoRoute.tsx" }),
});
