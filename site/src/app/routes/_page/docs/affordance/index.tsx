import { createFileRoute } from "@tanstack/react-router";
import { AffordanceDocsRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/affordance/")({
  component: AffordanceDocsRoute,
});
