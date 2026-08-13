import { createFileRoute } from "@tanstack/react-router";
import { ConceptsRoute } from "../../../../routes/docs/ConceptsRoute";

export const Route = createFileRoute("/_page/docs/concepts")({
  component: ConceptsRoute,
});
