import { createFileRoute } from "@tanstack/react-router";
import { AjvConnectorDemoRoute } from "../../../../routes/connectors/ajv/AjvConnectorDemoRoute";

export const Route = createFileRoute("/_page/connectors/ajv")({
  component: AjvConnectorDemoRoute,
});
