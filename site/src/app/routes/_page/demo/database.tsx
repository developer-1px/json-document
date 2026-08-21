import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { DatabaseDemoRoute } from "../../../../routes/database-demo/DatabaseDemoRoute";

export const Route = createFileRoute("/_page/demo/database")({
  ...defineDemo({ component: DatabaseDemoRoute, source: "routes/database-demo/DatabaseDemoRoute.tsx" }),
});
