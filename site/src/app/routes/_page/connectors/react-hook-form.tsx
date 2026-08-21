import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { ReactHookFormConnectorDemoRoute } from "../../../../routes/connectors/react-hook-form/ReactHookFormConnectorDemoRoute";

export const Route = createFileRoute("/_page/connectors/react-hook-form")({
  ...defineDemo({ component: ReactHookFormConnectorDemoRoute, source: "routes/connectors/react-hook-form/ReactHookFormConnectorDemoRoute.tsx" }),
});
