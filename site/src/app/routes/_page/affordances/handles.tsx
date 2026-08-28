import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { InteractionHandleDemoRoute } from "../../../../routes/affordances/handles/InteractionHandleDemoRoute";

export const Route = createFileRoute("/_page/affordances/handles")({
  component: InteractionHandleDemoRoute,
  ...defineDemo({ source: "routes/affordances/handles/InteractionHandleDemoRoute.tsx" }),
});
