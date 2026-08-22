import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../../shared/demo-workbench/define-demo";
import { ZodValidateDemoRoute } from "../../../../../routes/connectors/zod/ZodValidateDemoRoute";

export const Route = createFileRoute("/_page/connectors/zod/validate")({
  component: ZodValidateDemoRoute,
  ...defineDemo({ source: "routes/connectors/zod/ZodValidateDemoRoute.tsx" }),
});
