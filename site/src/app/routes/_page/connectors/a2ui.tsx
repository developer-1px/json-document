import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { A2uiConnectorDemoRoute } from "../../../../routes/connectors/a2ui/A2uiConnectorDemoRoute";

export const Route = createFileRoute("/_page/connectors/a2ui")({
  component: A2uiConnectorDemoRoute,
  ...defineDemo({ source: "routes/connectors/a2ui/A2uiConnectorDemoRoute.tsx" }),
});
