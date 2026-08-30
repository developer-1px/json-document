import { createFileRoute } from "@tanstack/react-router";
import { defineDemo } from "../../../../shared/demo-workbench/define-demo";
import { LlmAgentHandRoute } from "../../../../routes/llm-agent-hand/LlmAgentHandRoute";

export const Route = createFileRoute("/_page/demo/llm-agent-chat")({
  component: LlmAgentHandRoute,
  ...defineDemo({ source: "routes/llm-agent-hand/LlmAgentHandRoute.tsx" }),
});
