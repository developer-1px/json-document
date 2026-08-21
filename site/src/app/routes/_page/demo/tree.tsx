import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { TreeDemoRoute } from "../../../../routes/tree-demo/TreeDemoRoute";

export const Route = createFileRoute("/_page/demo/tree")({
  ...defineDemo({ component: TreeDemoRoute, source: "routes/tree-demo/TreeDemoRoute.tsx" }),
});
