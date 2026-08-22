import { createFileRoute } from "@tanstack/react-router";
import { DocsRoute } from "../../../../routes/docs/DocsRoute";

export const Route = createFileRoute("/_page/docs/chat")({
  component: function ChatDocsRoute() {
    return <DocsRoute pageId="chat" />;
  },
});
