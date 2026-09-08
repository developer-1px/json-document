import { createFileRoute } from "@tanstack/react-router";
import { ApplicationsRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/applications/")({
  component: ApplicationsRoute,
});
