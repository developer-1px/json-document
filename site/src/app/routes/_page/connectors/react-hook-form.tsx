import { createFileRoute } from "@tanstack/react-router";
import { ReactHookFormConnectorDemoRoute } from "../../../../routes/connectors/react-hook-form/ReactHookFormConnectorDemoRoute";

export const Route = createFileRoute("/_page/connectors/react-hook-form")({
  component: ReactHookFormConnectorDemoRoute,
});
