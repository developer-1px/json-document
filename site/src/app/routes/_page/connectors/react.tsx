import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { ReactConnectorDemoRoute } from "../../../../routes/connectors/react/ReactConnectorDemoRoute";

export const Route = createFileRoute("/_page/connectors/react")({
  ...defineDemo({ component: ReactConnectorDemoRoute, source: "routes/connectors/react/ReactConnectorDemoRoute.tsx" }),
});
