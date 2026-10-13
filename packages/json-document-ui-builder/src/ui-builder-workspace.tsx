import { useState } from "react";
import { useEditingSnapshot } from "@interactive-os/json-document-react";
import { applyUIBuilderMaterials, readUIBuilderProject, type ObjectEditor, type UIBuilderMaterialCommand, type UIBuilderSampleGenerator } from "@interactive-os/json-document-editing";
import { UIBuilderHand } from "@interactive-os/json-document-canvas";
import { Command, Tabs, floatingSurface } from "@interactive-os/json-document-ui-primitives-react";
import { DataMaterialsHand, ActionMaterialsHand } from "./materials-hand.js";

/** Project navigation and materials editing; all committed values/history belong to the supplied editor. */
export function UIBuilderWorkspace({editor, generateSamples}: {readonly editor: ObjectEditor; readonly generateSamples: UIBuilderSampleGenerator}) {
  const snapshot = useEditingSnapshot(editor);
  const project = readUIBuilderProject(snapshot.value);
  const [tab, setTab] = useState<"screen" | "data" | "actions">("screen");
  const [error, setError] = useState<string | null>(null);
  function commit(command: UIBuilderMaterialCommand) {
    const result = applyUIBuilderMaterials(editor, [command], generateSamples);
    setError(result.ok ? null : "reason" in result ? String(result.reason) : "변경을 적용하지 못했습니다.");
    return result.ok;
  }
  return <div className="ui-builder-workspace">
    <div className={`${floatingSurface.control} builder-navigation`}>
      <Tabs label="빌더 작업" value={tab} options={[{id: "screen", label: "화면"}, {id: "data", label: "데이터"}, {id: "actions", label: "액션·스킬"}]} onValueChange={setTab} tabId={id => `builder-tab-${id}`} panelId={id => `builder-panel-${id}`} />
      {tab !== "screen" && <><Command disabled={!snapshot.canUndo} onClick={() => editor.undo()}>실행 취소</Command><Command disabled={!snapshot.canRedo} onClick={() => editor.redo()}>다시 실행</Command></>}
    </div>
    <section className="builder-panel" role="tabpanel" id={`builder-panel-${tab}`} aria-labelledby={`builder-tab-${tab}`}>
      {tab === "screen" ? <UIBuilderHand editor={editor} /> : tab === "data" ? <DataMaterialsHand onHistory={direction => editor[direction]()} project={project} commit={commit} /> : <ActionMaterialsHand project={project} commit={commit} />}
    </section>
    {error && <div className={`${floatingSurface.panel} builder-error`} role="alert">{error}<Command onClick={() => setError(null)}>닫기</Command></div>}
  </div>;
}
