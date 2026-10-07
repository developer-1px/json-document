import { createFileRoute } from "@tanstack/react-router";
import { ArchitectureRoute } from "../../../../routes/docs/ArchitectureRoute";

export const Route = createFileRoute("/_page/docs/architecture")({
  component: ArchitectureRoute,
});
