import { createFileRoute } from "@tanstack/react-router";
import { ConnectorCatalogRoute } from "../../../../routes/connectors/ConnectorCatalogRoute";

export const Route = createFileRoute("/_page/connectors/")({
  component: ConnectorCatalogRoute,
});
