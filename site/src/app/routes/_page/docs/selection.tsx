import { createFileRoute } from "@tanstack/react-router";
import { SelectionDocsRoute } from "../../../../routes/docs/ArchitectureRoute";

export const Route = createFileRoute("/_page/docs/selection")({
  component: SelectionDocsRoute,
});
