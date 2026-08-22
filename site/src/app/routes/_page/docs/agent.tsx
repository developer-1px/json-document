import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/agent")({
  component: function AgentDocsRoute() {
    return <DocsRoute pageId="agent" />;
  },
});
