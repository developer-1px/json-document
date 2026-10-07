import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { ChatDemoRoute } from "../../../../routes/chat-demo/ChatDemoRoute";

export const Route = createFileRoute("/_page/demo/chat")({
  component: ChatDemoRoute,
  ...defineDemo({ source: "routes/chat-demo/ChatDemoRoute.tsx" }),
});
