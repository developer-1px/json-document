import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { TopologyDemoRoute } from "../../../../routes/editing-demos/TopologyDemoRoute";

export const Route = createFileRoute("/_page/demo/topology")({
  component: TopologyDemoRoute,
  ...defineDemo({ source: "routes/editing-demos/TopologyDemoRoute.tsx" }),
});
