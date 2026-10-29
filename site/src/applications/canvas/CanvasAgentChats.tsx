import { useEffect, useState, useSyncExternalStore } from "react";
import type { CollaborationWorkspace } from "@interactive-os/json-document-collaboration/history";
import { createCollaborationCanvasTools } from "@interactive-os/json-document-collaboration/editing";
import { defaultObjectContainerPolicy } from "@interactive-os/json-document-object-document";
import { measureWebText, webCanvasHTMLAdapter } from "@interactive-os/json-document-web";
import { WindowDock, Command, floatingSurface } from "@interactive-os/json-document-ui-primitives-react";
import type { CanvasEditTarget } from "@interactive-os/json-document-canvas";
import { EditorAgentChat, type AgentChatContext } from "../../app/EditorAgentChat";
import { createAgentChatDirectory, type AgentChatDirectory, type AgentChatMessage } from "../../app/agent-chat-session";

type ConversationState = AgentChatMessage["state"] | null;
function CanvasConversation({ workspace, id, onStateChange, context, onClearContext }: {
  context?: AgentChatContext; onClearContext: (id: string) => void;
  workspace: CollaborationWorkspace; id: string; onStateChange: (state: ConversationState) => void;
}) {
  const [tools] = useState(() => createCollaborationCanvasTools(workspace.participant(id), { measureText: measureWebText, containerPolicy: defaultObjectContainerPolicy }, webCanvasHTMLAdapter));
  return <EditorAgentChat {...(context ? { context } : {})} onClearContext={onClearContext} presentation="embedded" tools={tools} id={id} label="Canvas 도우미" logLabel="Canvas 대화" inputLabel="Canvas 편집 요청" placeholder="만들거나 바꿀 내용을 말해보세요" onStateChange={onStateChange} />;
}

export function CanvasAgentChats({ workspace, editRequest }: { workspace: CollaborationWorkspace; editRequest?: { id: string; target: CanvasEditTarget } }) {
  const [stored] = useState(() => createAgentChatDirectory("canvas", "canvas-chat"));
  const directory = useSyncExternalStore(stored.source.subscribe, () => stored.source.snapshot.value) as AgentChatDirectory;
  const saveState = useSyncExternalStore(stored.subscribe, () => stored.state);
  const conflicts = useSyncExternalStore(workspace.subscribe, () => workspace.runtime.replica.status().conflicts.length);
  const [contexts, setContexts] = useState<Record<string, AgentChatContext>>({});
  useEffect(() => {
    if (!editRequest) return;
    const current = stored.source.snapshot.value as AgentChatDirectory;
    const id = current.activeId || current.ids.at(-1) || `canvas-chat-${crypto.randomUUID()}`;
    setContexts(contexts => ({ ...contexts, [id]: { id: editRequest.id, label: editRequest.target.label, prompt: JSON.stringify(editRequest.target) } }));
    stored.source.update(current => ({ ids: current.ids.includes(id) ? current.ids : [...current.ids, id], activeId: id }));
  }, [editRequest, stored]);
  const [states, setStates] = useState<Record<string, ConversationState>>({});
  useEffect(() => stored.connect(), [stored]);
  const select = (activeId: string) => stored.source.update(current => ({ ...current, activeId }));
  const add = () => {
    const id = `canvas-chat-${crypto.randomUUID()}`;
    stored.source.update(current => ({ activeId: id, ids: [...current.ids, id] }));
  };
  return <WindowDock className="canvas-chat-dock" label="Canvas 대화 창" activeId={directory.activeId} {...(editRequest ? { activationKey: editRequest.id } : {})} onActivate={select} onClose={id => stored.source.update(current => {
    const ids = current.ids.filter(value => value !== id);
    return { ids, activeId: current.activeId === id ? ids.at(-1) ?? "" : current.activeId };
  })}
    action={<Command className={`${floatingSurface.control} shrink-0 text-xs`} onClick={add}>새 대화</Command>}
    notice={<>
      {conflicts > 0 && <p role="status" className="m-0 self-end text-xs text-foreground-secondary">동시에 수정된 항목 {conflicts}개가 있습니다. 대화에서 병합 결과를 확인해 주세요.</p>}
      {(saveState === "load-error" || saveState === "save-error") && <p role="alert" className="m-0 self-end text-xs text-foreground-secondary">대화 목록을 보관하지 못했습니다. 기존 저장 데이터는 유지됩니다.</p>}
    </>}
    items={directory.ids.map((id, index) => ({
      id, title: `대화 ${index + 1}`,
      status: states[id] === "running" ? "작업 중" : states[id] === "complete" ? "완료" : states[id] === "error" || states[id] === "interrupted" ? "확인 필요" : undefined,
      content: <CanvasConversation {...(contexts[id] ? { context: contexts[id] } : {})} onClearContext={contextId => setContexts(current => { if (current[id]?.id !== contextId) return current; const next = { ...current }; delete next[id]; return next; })} workspace={workspace} id={id} onStateChange={state => setStates(current => current[id] === state ? current : { ...current, [id]: state })} />,
    }))} />;
}
