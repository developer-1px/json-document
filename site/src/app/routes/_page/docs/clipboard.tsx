import { createFileRoute } from "@tanstack/react-router";
import { ClipboardDocsRoute } from "../../../../routes/docs/ConceptsRoute";

export const Route = createFileRoute("/_page/docs/clipboard")({
  component: ClipboardDocsRoute,
});
