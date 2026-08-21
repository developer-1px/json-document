import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../../shared/demo-workbench/define-demo";
import { ZodConnectorDemoRoute } from "../../../../../routes/connectors/zod/ZodConnectorDemoRoute";

export const Route = createFileRoute("/_page/connectors/zod/")({
  component: ZodConnectorDemoRoute,
  ...defineDemo({ source: "routes/connectors/zod/ZodConnectorDemoRoute.tsx" }),
});
