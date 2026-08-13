import { createFileRoute } from "@tanstack/react-router";
import { ReactConnectorDemoRoute } from "../../../../routes/connectors/react/ReactConnectorDemoRoute";

export const Route = createFileRoute("/_page/connectors/react")({
  component: ReactConnectorDemoRoute,
});
