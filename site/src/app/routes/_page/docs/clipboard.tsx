import { createFileRoute } from "@tanstack/react-router";
import { ClipboardDocsRoute } from "../../../../routes/docs/ArchitectureRoute";

export const Route = createFileRoute("/_page/docs/clipboard")({
  component: ClipboardDocsRoute,
});
