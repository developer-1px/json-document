import { createFileRoute } from "@tanstack/react-router";
import { TreeDemoRoute } from "../../../../routes/tree-demo/TreeDemoRoute";

export const Route = createFileRoute("/_page/demo/tree")({
  component: TreeDemoRoute,
});
