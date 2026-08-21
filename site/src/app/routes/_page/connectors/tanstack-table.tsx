import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { TanStackTableConnectorDemoRoute } from "../../../../routes/connectors/tanstack-table/TanStackTableConnectorDemoRoute";

export const Route = createFileRoute("/_page/connectors/tanstack-table")({
  ...defineDemo({ component: TanStackTableConnectorDemoRoute, source: "routes/connectors/tanstack-table/TanStackTableConnectorDemoRoute.tsx" }),
});
