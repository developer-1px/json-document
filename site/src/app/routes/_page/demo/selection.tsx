import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { SelectionDemoRoute } from "../../../../routes/editing-demos/SelectionDemoRoute";

export const Route = createFileRoute("/_page/demo/selection")({
  ...defineDemo({ component: SelectionDemoRoute, source: "routes/editing-demos/SelectionDemoRoute.tsx" }),
});
