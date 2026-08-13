import { createFileRoute } from "@tanstack/react-router";
import { DatabaseDemoRoute } from "../../../../routes/database-demo/DatabaseDemoRoute";

export const Route = createFileRoute("/_page/demo/database")({
  component: DatabaseDemoRoute,
});
