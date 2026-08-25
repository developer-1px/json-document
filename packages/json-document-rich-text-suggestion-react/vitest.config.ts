import { defineConfig } from "vitest/config";
export default defineConfig({ test: { name: "json-document-rich-text-suggestion-react", environment: "jsdom", include: ["tests/**/*.test.tsx"] } });
