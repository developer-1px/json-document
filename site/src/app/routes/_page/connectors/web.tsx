import { createFileRoute } from "@tanstack/react-router";
import { WebConnectorDemoRoute } from "../../../../routes/connectors/web/WebConnectorDemoRoute";

export const Route = createFileRoute("/_page/connectors/web")({
  component: WebConnectorDemoRoute,
});
