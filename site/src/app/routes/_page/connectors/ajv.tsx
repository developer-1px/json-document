import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { AjvConnectorDemoRoute } from "../../../../routes/connectors/ajv/AjvConnectorDemoRoute";

export const Route = createFileRoute("/_page/connectors/ajv")({
  ...defineDemo({ component: AjvConnectorDemoRoute, source: "routes/connectors/ajv/AjvConnectorDemoRoute.tsx" }),
});
