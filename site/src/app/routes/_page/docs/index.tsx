import { createFileRoute } from "@tanstack/react-router";
import { DocsOverviewRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/")({
  component: DocsOverviewRoute,
});
