import { createFileRoute } from "@tanstack/react-router";
import { ClipboardAdapterDemoRoute } from "../../../../routes/adapters/clipboard/ClipboardAdapterDemoRoute";

export const Route = createFileRoute("/_page/adapters/clipboard")({
  component: ClipboardAdapterDemoRoute,
});
