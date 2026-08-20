import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/affordance/nudge")({
  component: function AffordanceNudgeDocsRoute() {
    return <DocsRoute pageId="affordanceNudge" />;
  },
});
