import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { ClipboardAdapterDemoRoute } from "../../../../routes/adapters/clipboard/ClipboardAdapterDemoRoute";

export const Route = createFileRoute("/_page/adapters/clipboard")({
  component: ClipboardAdapterDemoRoute,
  ...defineDemo({ source: "routes/adapters/clipboard/ClipboardAdapterDemoRoute.tsx" }),
});
