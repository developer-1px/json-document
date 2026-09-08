import { setupWorker } from "msw/browser";
import { llmAgentHandlers } from "./llm-agent";

export const mockWorker = setupWorker(...llmAgentHandlers);
