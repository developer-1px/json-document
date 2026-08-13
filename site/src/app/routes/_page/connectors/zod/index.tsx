import { createFileRoute } from "@tanstack/react-router";
import { ZodConnectorDemoRoute } from "../../../../../routes/connectors/zod/ZodConnectorDemoRoute";

export const Route = createFileRoute("/_page/connectors/zod/")({
  component: ZodConnectorDemoRoute,
});
