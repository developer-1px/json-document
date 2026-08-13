import { createFileRoute } from "@tanstack/react-router";
import { SelectionDemoRoute } from "../../../../routes/editing-demos/SelectionDemoRoute";

export const Route = createFileRoute("/_page/demo/selection")({
  component: SelectionDemoRoute,
});
