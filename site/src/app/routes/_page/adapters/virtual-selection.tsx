import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { VirtualSelectionAdapterDemoRoute } from "../../../../routes/adapters/virtual-selection/VirtualSelectionAdapterDemoRoute";

export const Route = createFileRoute("/_page/adapters/virtual-selection")({
  component: VirtualSelectionAdapterDemoRoute,
  ...defineDemo({ source: "routes/adapters/virtual-selection/VirtualSelectionAdapterDemoRoute.tsx" }),
});
