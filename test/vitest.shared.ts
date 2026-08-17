import { defineConfig, mergeConfig } from "vitest/config";
import type { UserConfig } from "vite";

const typescriptTests = ["tests/**/*.test.ts"];
const typescriptReactTests = ["tests/**/*.test.ts", "tests/**/*.test.tsx"];

function defineProject(
  name: string,
  environment: "node" | "jsdom",
  include: string[],
  config: UserConfig,
) {
  return defineConfig(mergeConfig({
    test: {
      name,
      environment,
      include,
      isolate: true,
    },
  }, config));
}

export function defineNodeProject(name: string, config: UserConfig = {}) {
  return defineProject(name, "node", typescriptTests, config);
}

export function defineNodeReactProject(name: string, config: UserConfig = {}) {
  return defineProject(name, "node", typescriptReactTests, config);
}

export function defineDOMProject(name: string, config: UserConfig = {}) {
  return defineProject(name, "jsdom", typescriptTests, config);
}

export function defineDOMReactProject(name: string, config: UserConfig = {}) {
  return defineProject(name, "jsdom", typescriptReactTests, config);
}
