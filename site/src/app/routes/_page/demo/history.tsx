import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { HistoryDemoRoute } from "../../../../routes/editing-demos/HistoryDemoRoute";

export const Route = createFileRoute("/_page/demo/history")({
  ...defineDemo({ component: HistoryDemoRoute, source: "routes/editing-demos/HistoryDemoRoute.tsx" }),
});
