import { createFileRoute } from "@tanstack/react-router";
import { IntentGuideRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/intent-guide")({
  component: IntentGuideRoute,
});
