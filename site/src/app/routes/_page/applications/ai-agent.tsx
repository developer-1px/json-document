import { createFileRoute } from "@tanstack/react-router";
import { LlmAgentArtifactRoute } from "../../../../routes/llm-agent-artifact/LlmAgentArtifactRoute";

export const Route = createFileRoute("/_page/applications/ai-agent")({
  component: LlmAgentArtifactRoute,
});
