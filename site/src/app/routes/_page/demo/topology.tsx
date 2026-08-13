import { createFileRoute } from "@tanstack/react-router";
import { TopologyDemoRoute } from "../../../../routes/editing-demos/TopologyDemoRoute";

export const Route = createFileRoute("/_page/demo/topology")({
  component: TopologyDemoRoute,
});
