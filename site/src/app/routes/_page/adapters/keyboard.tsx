import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { KeyboardAdapterDemoRoute } from "../../../../routes/adapters/keyboard/KeyboardAdapterDemoRoute";

export const Route = createFileRoute("/_page/adapters/keyboard")({
  component: KeyboardAdapterDemoRoute,
  ...defineDemo({ source: "routes/adapters/keyboard/KeyboardAdapterDemoRoute.tsx" }),
});
