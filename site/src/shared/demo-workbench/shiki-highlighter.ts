import typescript from "@shikijs/langs/typescript";
import tsx from "@shikijs/langs/tsx";
import githubLightDefault from "@shikijs/themes/github-light-default";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import type { HighlightedCodeToken } from "../ui/code-block";
import type { CodeLanguage } from "../ui/code-tokens";

const highlighter = createHighlighterCore({
  themes: [githubLightDefault],
  langs: [typescript, tsx],
  engine: createJavaScriptRegexEngine(),
});

export async function highlightSource(
  source: string,
  language: CodeLanguage,
): Promise<ReadonlyArray<ReadonlyArray<HighlightedCodeToken>>> {
  if (language !== "typescript" && language !== "tsx") return [];
  const instance = await highlighter;
  return instance.codeToTokensBase(source, {
    lang: language,
    theme: "github-light-default",
  });
}
