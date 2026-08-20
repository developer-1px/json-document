import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/affordance/cancel")({
  component: function AffordanceCancelDocsRoute() {
    return <DocsRoute pageId="affordanceCancel" />;
  },
});
