import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_page/artifact/llm-agent")({
  component: function AiAgentLegacyRedirect() {
    return <Navigate to="/applications/ai-agent" replace />;
  },
});
