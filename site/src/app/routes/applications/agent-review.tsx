import { createFileRoute } from "@tanstack/react-router";
import { AgentReviewApplication } from "../../../applications/agent-review/AgentReviewApplication";
export const Route = createFileRoute("/applications/agent-review")({ component: AgentReviewApplication });
