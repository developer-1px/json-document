import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { KanbanDemoRoute } from "../../../../routes/kanban-demo/KanbanDemoRoute";

export const Route = createFileRoute("/_page/demo/kanban")({
  component: KanbanDemoRoute,
  ...defineDemo({ source: "routes/kanban-demo/KanbanDemoRoute.tsx" }),
});
