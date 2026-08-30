import { richTextPlainText } from "@interactive-os/json-document-rich-text";
import type { ComposerDraft } from "@interactive-os/json-document-composer";
import { ComposerSurface } from "../../shared/composer/ComposerDemo";

export function LlmAgentArtifactRoute() {
  return (
    <div className="llm-agent-app">
      <header className="llm-agent-app-header">
        <strong>LLM Agent</strong>
        <span>Local Codex</span>
      </header>
      <ComposerSurface submit={submitToCodex} />
    </div>
  );
}

async function submitToCodex(draft: ComposerDraft, write: (delta: string) => void) {
  const response = await fetch("/__dev/codex", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: richTextPlainText(draft.instruction.content) }),
  });
  if (!response.ok || !response.body) throw new Error(await response.text());

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    write(value);
  }
}
