import { useEffect, useRef, useState, type ReactNode } from "react";
import { useEditingSnapshot } from "@interactive-os/json-document-react";
import { createUIBuilderRecordSelection, applyUIBuilderMaterials, readUIBuilderProject, type ObjectEditor, type UIBuilderMaterialCommand, type UIBuilderSampleGenerator, type UIBuilderSkillDefinition, type UIBuilderRecordSelection, type UIBuilderRuntimeValues } from "@interactive-os/json-document-editing";
import { UIBuilderScreenControls } from "@interactive-os/json-document-canvas";
import { Command, Tabs, Toolbar, ToolbarGroup, floatingSurface } from "@interactive-os/json-document-ui-primitives-react";
import { BuilderBindingControl } from "./catalog-controls.js";
import { BuilderPageControls } from "./page-controls.js";
import { UIBuilderRuntimeHand } from "./runtime-hand.js";
import { DataMaterialsHand, ActionMaterialsHand } from "./materials-hand.js";

/** Project navigation and materials editing; all committed values/history belong to the supplied editor. */
export function UIBuilderWorkspace({editor, generateSamples, skills = [], navigation, status, arrange, initialTab = "screen", pageId: controlledPageId, onPageChange}: {readonly editor: ObjectEditor; readonly generateSamples: UIBuilderSampleGenerator; readonly skills?: readonly UIBuilderSkillDefinition[]; readonly navigation?: ReactNode; readonly status?: ReactNode; readonly arrange?: (signal: AbortSignal, context?: {pageId: string; selection: UIBuilderRecordSelection; runtimeValues: UIBuilderRuntimeValues}) => Promise<void>; readonly initialTab?: "screen" | "run"; readonly pageId?: string; readonly onPageChange?: (pageId:string)=>void}) {
  const snapshot = useEditingSnapshot(editor);
  const project = readUIBuilderProject(snapshot.value);
  const [tab, setTab] = useState<"screen" | "data" | "actions" | "run">(initialTab);
  const [screenEditing, setScreenEditing] = useState(initialTab === "screen");
  const [recordSelection, setRecordSelection] = useState<UIBuilderRecordSelection>(() => createUIBuilderRecordSelection(project));
  const [runtimeValues, setRuntimeValues] = useState<UIBuilderRuntimeValues>({});
  const [pageId, setPageId] = useState(project.activePageId);
  const previousActivePage = useRef(project.activePageId);
  useEffect(() => {if (previousActivePage.current !== project.activePageId) {previousActivePage.current = project.activePageId; (onPageChange ?? setPageId)(project.activePageId);}}, [project.activePageId]);
  const currentPageId = project.pages.some(page => page.id === (controlledPageId ?? pageId)) ? (controlledPageId ?? pageId)! : project.activePageId;
  const displayProject = {...project, activePageId: currentPageId};
  const [arranging, setArranging] = useState(false);
  const arrangement = useRef<AbortController | null>(null);
  useEffect(() => () => arrangement.current?.abort(), []);
  async function resumeRun() {
    if (arrangement.current) return;
    if (!arrange) {setError("실행하려면 AI 배치 정리가 필요합니다."); return;}
    const controller = new AbortController(); arrangement.current = controller;
    setArranging(true); setError(null);
    try {
      await arrange(controller.signal, {pageId: currentPageId, selection: recordSelection, runtimeValues});
      if (!controller.signal.aborted) {setScreenEditing(false); setTab("run");}
    } catch (cause) {if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "화면을 정리하지 못했습니다.");}
    finally {arrangement.current = null; setArranging(false);}
  }
  function changeTab(next: typeof tab) {
    if (arranging) return;
    if (next === "run" && tab !== "run" && screenEditing) {void resumeRun(); return;}
    if (next === "screen") setScreenEditing(true);
    setTab(next);
  }
  const [error, setError] = useState<string | null>(null);
  function commit(command: UIBuilderMaterialCommand) {
    const result = applyUIBuilderMaterials(editor, [command], generateSamples);
    setError(result.ok ? null : "reason" in result ? String(result.reason) : "변경을 적용하지 못했습니다.");
    return result.ok;
  }
  return <div className="ui-builder-workspace">
    <Toolbar label="빌더 도구" className="builder-navigation">
      <ToolbarGroup label="프로젝트" className={`${floatingSurface.control} builder-project-controls`}>{navigation}</ToolbarGroup>
      <ToolbarGroup label="작업 모드" className={`${floatingSurface.control} builder-mode-controls`}>
        <Tabs label="빌더 작업" value={tab} options={[{id: "screen", label: "디자인", disabled: arranging}, {id: "data", label: "데이터", disabled: arranging}, {id: "actions", label: "액션·스킬", disabled: arranging}, {id: "run", label: "미리보기", disabled: arranging}]} onValueChange={changeTab} tabId={id => `builder-tab-${id}`} panelId={id => `builder-panel-${id}`} />
      </ToolbarGroup>
      <ToolbarGroup label="현재 페이지와 반영" className={`${floatingSurface.control} builder-document-controls`}>
        {(tab === "screen" || tab === "run") && <BuilderPageControls editor={editor} project={displayProject} onError={setError} editable={tab === "screen"} onPageChange={onPageChange ?? setPageId} />}
        {status}
        {tab === "screen" && <Command kind="primary" aria-busy={arranging} disabled={arranging} onClick={() => void resumeRun()}>{arranging ? "정리 중…" : "반영하고 미리보기"}</Command>}
        {arranging && <Command onClick={() => arrangement.current?.abort()}>취소</Command>}
        {tab !== "screen" && tab !== "run" && <><Command disabled={!snapshot.canUndo} onClick={() => editor.undo()}>실행 취소</Command><Command disabled={!snapshot.canRedo} onClick={() => editor.redo()}>다시 실행</Command></>}
      </ToolbarGroup>
    </Toolbar>
    <section className="builder-panel" role="tabpanel" id={`builder-panel-${tab}`} aria-labelledby={`builder-tab-${tab}`}>
      <div className="builder-screen" hidden={tab !== "run" && tab !== "screen"}>
        <UIBuilderRuntimeHand editor={editor} skills={skills} selection={recordSelection} onSelectionChange={setRecordSelection} runtimeValues={runtimeValues} onRuntimeValuesChange={setRuntimeValues} pageId={currentPageId} onPageChange={onPageChange ?? setPageId} editable={screenEditing} />
        {tab === "screen" && <div className="builder-screen-controls" inert={arranging}>
          <UIBuilderScreenControls editor={editor} pageId={currentPageId} />
          <BuilderBindingControl editor={editor} project={displayProject} />
        </div>}
      </div>
      {tab === "data" && <DataMaterialsHand onHistory={direction => editor[direction]()} project={project} commit={commit} />}
      {tab === "actions" && <ActionMaterialsHand project={project} skills={skills} commit={commit} />}
    </section>
    {error && <div className={`${floatingSurface.panel} builder-error`} role="alert">{error}<Command onClick={() => setError(null)}>닫기</Command></div>}
  </div>;
}
