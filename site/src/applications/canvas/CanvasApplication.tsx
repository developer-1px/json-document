import "./canvas-application.css";
import { defaultObjectContainerPolicy } from "@interactive-os/json-document-object-document";
import { measureWebText } from "@interactive-os/json-document-web";
import "@interactive-os/json-document-canvas/canvas-hand.css";
import { createWebStoredDocument } from "@interactive-os/json-document-web";
import { assertCanvasDocument } from "@interactive-os/json-document-object-document";
import { createHistoryRuntime, restoreHistoryRuntime, createCollaborationWorkspace } from "@interactive-os/json-document-collaboration/history";
import { createCollaborationEditingHistory } from "@interactive-os/json-document-collaboration/editing";
import { CanvasAgentChats } from "./CanvasAgentChats";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createObjectEditor } from "@interactive-os/json-document-editing";
import { CanvasHand, type CanvasEditTarget } from "@interactive-os/json-document-canvas";
import { createPlaneSelectProfile } from "@interactive-os/json-document-affordance";
import { canvasCreationStyle, emptyCanvasDocument } from "../../shared/demo-workbench/canvas-demo-document";

export function CanvasApplication() {
  const [stored] = useState(() => {
    const options = { actorId: "canvas-human", ruleset: { id: "canvas", digest: "canvas/objects/v1" },
      validate: (value: import("@interactive-os/json-document").JSONValue) => {
        try { assertCanvasDocument(value); return { ok: true as const }; }
        catch { return { ok: false as const, code: "canvas.invalid-document" }; }
      } };
    const wrap = (runtime: ReturnType<typeof createHistoryRuntime>) => createCollaborationWorkspace(runtime, options);
    return createWebStoredDocument({ key: "json-document.canvas.v1", storage: () => window.localStorage,
      create: () => wrap(createHistoryRuntime(emptyCanvasDocument, { ...options, epochId: crypto.randomUUID() })),
      restore: value => {
        // Preserve existing Canvas content while migrating plain snapshots to checkpoints.
        if (value && typeof value === "object" && "objects" in value) {
          assertCanvasDocument(value);
          return wrap(createHistoryRuntime(value, { ...options, epochId: crypto.randomUUID() }));
        }
        const restored = restoreHistoryRuntime(value, options);
        if (!restored.ok) throw new Error(restored.reason);
        return wrap(restored.runtime);
      },
    });
  });
  const [editRequest, setEditRequest] = useState<{ id: string; target: CanvasEditTarget }>();
  const workspace = stored.source;
  const [editor] = useState(() => createObjectEditor(workspace.runtime.document, { measureText: measureWebText, containerPolicy: defaultObjectContainerPolicy,
    history: createCollaborationEditingHistory(workspace.runtime) }));
  const saveState = useSyncExternalStore(stored.subscribe, () => stored.state);
  useEffect(() => stored.connect(), [stored]);
  const [selectProfile] = useState(() => createPlaneSelectProfile());
  return (
    <main aria-label="Canvas 작업 공간" className="canvas-application h-dvh w-full overflow-hidden">
      <CanvasHand onRequestEdit={target => setEditRequest({ id: crypto.randomUUID(), target })} workspace editor={editor} selectProfile={selectProfile} creationStyle={canvasCreationStyle} slideStyle={{ background: "rgb(var(--color-background-canvas))" }} />
      {(saveState === "save-error" || saveState === "load-error") && <p role="alert">Canvas 저장 데이터를 확인해 주세요. 기존 데이터는 유지됩니다.</p>}
      <CanvasAgentChats workspace={workspace} {...(editRequest ? { editRequest } : {})} />
    </main>
  );
}
