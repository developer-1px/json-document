import { createFileRoute } from "@tanstack/react-router";
import { ZodValidateDemoRoute } from "../../../../../routes/connectors/zod/ZodValidateDemoRoute";

export const Route = createFileRoute("/_page/connectors/zod/validate")({
  component: ZodValidateDemoRoute,
});
