import { createFileRoute } from "@tanstack/react-router";
import { HistoryDemoRoute } from "../../../../routes/editing-demos/HistoryDemoRoute";

export const Route = createFileRoute("/_page/demo/history")({
  component: HistoryDemoRoute,
});
