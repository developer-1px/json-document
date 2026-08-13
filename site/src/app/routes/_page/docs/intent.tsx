import { createFileRoute } from "@tanstack/react-router";
import { IntentRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/intent")({
  component: IntentRoute,
});
