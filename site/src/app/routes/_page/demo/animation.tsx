import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { AnimationDemoRoute } from "../../../../routes/animation-demo/AnimationDemoRoute";

export const Route = createFileRoute("/_page/demo/animation")({
  component: AnimationDemoRoute,
  ...defineDemo({ source: "routes/animation-demo/AnimationDemoRoute.tsx" }),
});
