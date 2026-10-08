import { useState } from "react";
import { createTextEditorTools, type TextEditor } from "@interactive-os/json-document-editing";
import { EditorAgentChat } from "../../app/EditorAgentChat";

export function BearChat({ editor, onBusyChange }: { editor: TextEditor; onBusyChange?: (busy: boolean) => void }) {
  const [tools] = useState(() => createTextEditorTools(editor));
  return <EditorAgentChat tools={tools} id={`bear-chat${location.search}`} label="글쓰기 도우미" logLabel="Bear 대화" inputLabel="글쓰기 요청" placeholder="글을 쓰거나 다듬어 달라고 해보세요" onBusyChange={onBusyChange} />;
}
