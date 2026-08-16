import { createFileRoute } from "@tanstack/react-router";
import { KeyboardAdapterDemoRoute } from "../../../../routes/adapters/keyboard/KeyboardAdapterDemoRoute";

export const Route = createFileRoute("/_page/adapters/keyboard")({
  component: KeyboardAdapterDemoRoute,
});
