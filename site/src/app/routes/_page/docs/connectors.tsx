import { createFileRoute } from "@tanstack/react-router";
import { ConnectorDocsRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/connectors")({
  component: ConnectorDocsRoute,
});
