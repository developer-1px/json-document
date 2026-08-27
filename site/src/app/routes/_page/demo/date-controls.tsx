import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { DateControlsDemoRoute } from "../../../../routes/date-controls-demo/DateControlsDemoRoute";

export const Route = createFileRoute("/_page/demo/date-controls")({
  component: DateControlsDemoRoute,
  ...defineDemo({ source: "routes/date-controls-demo/DateControlsDemoRoute.tsx" }),
});
