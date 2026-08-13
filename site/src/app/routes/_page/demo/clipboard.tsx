import { createFileRoute } from "@tanstack/react-router";
import { ClipboardDemoRoute } from "../../../../routes/editing-demos/ClipboardDemoRoute";

export const Route = createFileRoute("/_page/demo/clipboard")({
  component: ClipboardDemoRoute,
});
