import { createFileRoute } from "@tanstack/react-router";
import { SelectionDocsRoute } from "../../../../routes/docs/ConceptsRoute";

export const Route = createFileRoute("/_page/docs/selection")({
  component: SelectionDocsRoute,
});
