import { createFileRoute } from "@tanstack/react-router";
import { KanbanDemoRoute } from "../../../../routes/kanban-demo/KanbanDemoRoute";

export const Route = createFileRoute("/_page/demo/kanban")({
  component: KanbanDemoRoute,
});
