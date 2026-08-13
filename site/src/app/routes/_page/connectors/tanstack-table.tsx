import { createFileRoute } from "@tanstack/react-router";
import { TanStackTableConnectorDemoRoute } from "../../../../routes/connectors/tanstack-table/TanStackTableConnectorDemoRoute";

export const Route = createFileRoute("/_page/connectors/tanstack-table")({
  component: TanStackTableConnectorDemoRoute,
});
