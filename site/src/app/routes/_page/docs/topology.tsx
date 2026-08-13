import { createFileRoute } from "@tanstack/react-router";
import { TopologyDocsRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/topology")({
  component: TopologyDocsRoute,
});
