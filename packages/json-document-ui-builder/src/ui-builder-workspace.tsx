import { useState, type ReactNode } from "react";
import { useEditingSnapshot } from "@interactive-os/json-document-react";
import { applyUIBuilderMaterials, readUIBuilderProject, type ObjectEditor, type UIBuilderMaterialCommand, type UIBuilderSampleGenerator, type UIBuilderSkillDefinition, type UIBuilderRecordSelection } from "@interactive-os/json-document-editing";
import { UIBuilderHand } from "@interactive-os/json-document-canvas";
import { Command, Tabs, floatingSurface } from "@interactive-os/json-document-ui-primitives-react";
import { BuilderDesignControls, BuilderBindingControl } from "./catalog-controls.js";
import { BuilderArrangeControl } from "./arrange-control.js";
import { UIBuilderRuntimeHand } from "./runtime-hand.js";
import { DataMaterialsHand, ActionMaterialsHand } from "./materials-hand.js";

/** Project navigation and materials editing; all committed values/history belong to the supplied editor. */
export function UIBuilderWorkspace({editor, generateSamples, skills = [], navigation, arrange, initialTab = "screen"}: {readonly editor: ObjectEditor; readonly generateSamples: UIBuilderSampleGenerator; readonly skills?: readonly UIBuilderSkillDefinition[]; readonly navigation?: ReactNode; readonly arrange?: (signal: AbortSignal) => Promise<void>; readonly initialTab?: "screen" | "run"}) {
  const snapshot = useEditingSnapshot(editor);
  const project = readUIBuilderProject(snapshot.value);
  const [tab, setTab] = useState<"screen" | "data" | "actions" | "run">(initialTab);
  const [recordSelection, setRecordSelection] = useState<UIBuilderRecordSelection>({});
  const [error, setError] = useState<string | null>(null);
  function commit(command: UIBuilderMaterialCommand) {
    const result = applyUIBuilderMaterials(editor, [command], generateSamples);
    setError(result.ok ? null : "reason" in result ? String(result.reason) : "변경을 적용하지 못했습니다.");
    return result.ok;
  }
  return <div className="ui-builder-workspace">
    <div className={`${floatingSurface.control} builder-navigation`}>
      <Tabs label="빌더 작업" value={tab} options={[{id: "run", label: "실행"}, {id: "screen", label: "화면"}, {id: "data", label: "데이터"}, {id: "actions", label: "액션·스킬"}]} onValueChange={setTab} tabId={id => `builder-tab-${id}`} panelId={id => `builder-panel-${id}`} />
      {tab === "screen" && arrange && <BuilderArrangeControl arrange={arrange} onError={setError} onApplied={() => setTab("run")} />}
      {tab === "screen" && <BuilderDesignControls editor={editor} project={project} />}
      {navigation}
      {tab !== "screen" && tab !== "run" && <><Command disabled={!snapshot.canUndo} onClick={() => editor.undo()}>실행 취소</Command><Command disabled={!snapshot.canRedo} onClick={() => editor.redo()}>다시 실행</Command></>}
    </div>
    <section className="builder-panel" role="tabpanel" id={`builder-panel-${tab}`} aria-labelledby={`builder-tab-${tab}`}>
      {tab === "run" ? <UIBuilderRuntimeHand editor={editor} skills={skills} selection={recordSelection} onSelectionChange={setRecordSelection} /> : tab === "screen" ? <UIBuilderHand editor={editor} recordSelection={recordSelection} toolbarContent={<BuilderBindingControl editor={editor} project={project} />} /> : tab === "data" ? <DataMaterialsHand onHistory={direction => editor[direction]()} project={project} commit={commit} /> : <ActionMaterialsHand project={project} skills={skills} commit={commit} />}
    </section>
    {error && <div className={`${floatingSurface.panel} builder-error`} role="alert">{error}<Command onClick={() => setError(null)}>닫기</Command></div>}
  </div>;
}
