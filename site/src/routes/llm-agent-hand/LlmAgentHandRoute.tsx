import { richTextPlainText } from "@interactive-os/json-document-rich-text";
import type { ComposerDraft } from "@interactive-os/json-document-composer";
import { ComposerDemo } from "../../shared/composer/ComposerDemo";

export function LlmAgentHandRoute() {
  return (
    <ComposerDemo
      title="LLM Agent Hand"
      description="Canonical Composer의 한 턴을 로컬 Codex app-server에 전달하고 응답을 스트리밍합니다."
      submit={submitToCodex}
    />
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
