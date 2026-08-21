import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { ClipboardDemoRoute } from "../../../../routes/editing-demos/ClipboardDemoRoute";

export const Route = createFileRoute("/_page/demo/clipboard")({
  ...defineDemo({ component: ClipboardDemoRoute, source: "routes/editing-demos/ClipboardDemoRoute.tsx" }),
});
