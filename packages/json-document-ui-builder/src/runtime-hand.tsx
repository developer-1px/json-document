import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useEditingSnapshot } from "@interactive-os/json-document-react";
import { appendUIBuilderActivity, createUIBuilderRecordSelection, resolveUIBuilderActionPrerequisites, executeUIBuilderAction, readUIBuilderProject, getUIBuilderPageObjects, resolveUIBuilderPageId, resolveUIBuilderComponent, resolveUIBuilderTableData, getUIBuilderRootObjects, uiBuilderComponentChildIds, setUIBuilderComponentValue, commitUIBuilderCollection, applyUIBuilderComponentConfiguration, type ObjectEditor, type UIBuilderRecordSelection, type UIBuilderRuntimeValues, type UIBuilderSkillDefinition } from "@interactive-os/json-document-editing";
import { resolveUIFlowLayout, type CanvasObject, type UIComponentObject } from "@interactive-os/json-document-object-document";
import { UIComponentSurface, UIScreenEditLayer, CanvasHand, type UIScreenEditBounds } from "@interactive-os/json-document-canvas";
import { Command, contentPresentation, floatingSurface } from "@interactive-os/json-document-ui-primitives-react";

/** Runs the saved component tree through the same projection as the editing canvas. */
export function UIBuilderRuntimeHand({editor, skills, selection: controlledSelection, onSelectionChange, runtimeValues: controlledRuntimeValues, onRuntimeValuesChange, editable = false, pageId: controlledPageId, onPageChange}: {readonly runtimeValues?: UIBuilderRuntimeValues; readonly onRuntimeValuesChange?: (values: UIBuilderRuntimeValues) => void; readonly editable?: boolean; readonly pageId?: string; readonly onPageChange?: (pageId: string) => void; readonly editor: ObjectEditor; readonly skills: readonly UIBuilderSkillDefinition[]; readonly selection?: UIBuilderRecordSelection; readonly onSelectionChange?: (selection: UIBuilderRecordSelection) => void}) {
  const snapshot = useEditingSnapshot(editor);
  const project = readUIBuilderProject(snapshot.value);
  const [pageId, setPageId] = useState(() => project.activePageId);
  useEffect(() => {setPageId(project.activePageId);}, [project.activePageId]);
  const currentPageId = resolveUIBuilderPageId(project, project.pages.some(page => page.id === (controlledPageId ?? pageId)) ? (controlledPageId ?? pageId) : project.activePageId);
  const pageObjects = getUIBuilderPageObjects(project, currentPageId);
  const [localSelection, setLocalSelection] = useState<UIBuilderRecordSelection>(() => createUIBuilderRecordSelection(project));
  const selection = controlledSelection ?? localSelection;
  const [running, setRunning] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [localRuntimeValues, setLocalRuntimeValues] = useState<UIBuilderRuntimeValues>({});
  const runtimeValues = controlledRuntimeValues ?? localRuntimeValues;
  const [failed, setFailed] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => {controller.current?.abort();}, []);
  async function run(actionId: string | undefined) {
    if (controller.current) return;
    if (!actionId) {setFailed(true); setMessage("버튼에 액션을 연결해 주세요."); return;}
    const action = project.actions.find(a => a.id === actionId);
    const abort = new AbortController(); controller.current = abort;
    setRunning(action?.name ?? "액션"); setMessage(""); setFailed(false);
    const result = await executeUIBuilderAction(editor, actionId, skills, selection, abort.signal);
    if (controller.current !== abort) return;
    controller.current = null; setRunning(null);
    setFailed(!result.ok); setMessage(result.ok ? `${action?.name ?? "액션"} 완료 · 결과가 데이터에 저장되었습니다.` : "reason" in result ? String(result.reason) : "실행하지 못했습니다.");
  }
  const flow = resolveUIFlowLayout(getUIBuilderRootObjects(pageObjects as readonly UIComponentObject[]), project.flow);
  const surface = useRef<HTMLDivElement>(null);
  const renderedChildren = useRef(new Map<string, HTMLDivElement>());
  const originPages = useRef<Record<string, Record<string, UIScreenEditBounds>>>({});
  const [previewObjects, setPreviewObjects] = useState<readonly CanvasObject[]>([]);
  const previewChanged = useCallback((objects: readonly CanvasObject[]) => setPreviewObjects(objects), []);
  const [flowGap, setFlowGap] = useState(0);
  const [screenSize, setScreenSize] = useState({width: project.width, height: project.height});
  const objectMembership = JSON.stringify({flow, composition: pageObjects.map(object => [object.id, uiBuilderComponentChildIds(object as UIComponentObject)])});
  const originLayouts = useRef<Record<string, string>>({});
  const [origins, setOrigins] = useState<Record<string, UIScreenEditBounds>>({});
  const displayedOrigins = originLayouts.current[currentPageId] === objectMembership ? origins : {};
  useLayoutEffect(() => {
    if (!editable) {originLayouts.current = {}; originPages.current = {}; setPreviewObjects([]); setOrigins({}); return;}
    const root = surface.current;
    if (!root) return;
    const frame = root.getBoundingClientRect();
    setFlowGap(Math.max(0, parseFloat(getComputedStyle(root.querySelector(".builder-flow-column") ?? root).rowGap) || 0));
    const previous = originLayouts.current[currentPageId] === objectMembership ? originPages.current[currentPageId] ?? {} : {};
    const measured: Record<string, UIScreenEditBounds> = {};
    [...root.querySelectorAll<HTMLElement>(".builder-flow-item[data-ui-component-object]"), ...renderedChildren.current.values()].forEach(element => {
      const objectId = element.dataset.uiComponentObject ?? element.dataset.uiChild!;
      if (previous[objectId]) return;
      const box = element.getBoundingClientRect();
      if (box.width <= 0 || box.height <= 0) return;
      measured[objectId] = {x: box.left - frame.left, y: box.top - frame.top, width: box.width, height: box.height};
    });
    if (!Object.keys(measured).length) {setOrigins(previous); return;}
    const value = editor.snapshot.value;
    const current = readUIBuilderProject(value);
    const result = editor.dispatch({type: "document.replace", document: {...current, objects: current.objects.map(object => measured[object.id] ? {...object, ...measured[object.id], width: Math.max(1, measured[object.id]!.width), height: Math.max(1, measured[object.id]!.height)} : object)}});
    if (!result.ok) {setFailed(true); setMessage("reason" in result ? String(result.reason) : "편집 화면을 준비하지 못했습니다.");}
    if (result.ok) {originLayouts.current[currentPageId] = objectMembership; setPreviewObjects([]); originPages.current[currentPageId] = {...previous, ...measured}; setOrigins(originPages.current[currentPageId]!);}
  }, [editable, currentPageId, objectMembership, editor]);
  useLayoutEffect(() => {
    if (!editable || !surface.current) return;
    const root = surface.current;
    const measure = () => setScreenSize({width: Math.max(1, root.clientWidth), height: Math.max(root.clientHeight, root.parentElement?.clientHeight ?? 0)});
    measure();
    const observer = new ResizeObserver(measure); observer.observe(root);
    if (root.parentElement) observer.observe(root.parentElement);
    return () => observer.disconnect();
  }, [editable, currentPageId]);
  function renderComponent(objectId: string) {
    const object = project.objects.find(o => o.id === objectId) as UIComponentObject;
    const projection = resolveUIBuilderComponent(project, object, selection, runtimeValues);
    if (projection.selectionMissing) return null;
    const binding = object.document.bindings?.find(b => b.target === "items");
    const table = project.tables.find(t => t.id === (object.document.collection?.tableId ?? binding?.tableId));
    const rowId = table && (selection[table.id] ?? table.data.records[0]?.id);
    const identityBinding = object.document.bindings?.find(binding => binding.mode === "value");
    const identityTableId = identityBinding?.tableId ?? (object.document.component === "record-workspace" && typeof object.document.props?.tableId === "string" ? object.document.props.tableId : undefined);
    const identityTable = project.tables.find(table => table.id === identityTableId);
    const selectedIdentity = identityTableId ? (identityBinding?.recordId || (selection[identityTableId] ?? identityTable?.data.records[0]?.id)) : undefined;
    const recordIdentity = identityTableId && selectedIdentity ? `${identityTableId}:${selectedIdentity}` : undefined;
    const actionTableId = project.actions.find(action => action.id === object.document.actionId)?.execution?.tableId;
    const actionHasNoSelection = actionTableId !== undefined && selection[actionTableId] === "";
    const prerequisites = object.document.actionId ? resolveUIBuilderActionPrerequisites(project, object.document.actionId, selection) : undefined;
    const navigate = (id: string) => {
      if (!project.pages.some(page => page.id === id)) {setFailed(true); setMessage("이동할 페이지가 없습니다. 목적지를 설정해 주세요."); return;}
      (onPageChange ?? setPageId)(id); setMessage(""); setFailed(false);
    };
    const report = (result: {ok: boolean; reason?: string}) => {if (!result.ok) {setFailed(true); setMessage(result.reason ?? "변경을 저장하지 못했습니다.");} return result.ok;};
    const changeProps = (patch: Record<string, import("@interactive-os/json-document").JSONValue>) => {
      const current = readUIBuilderProject(editor.snapshot.value).objects.find(candidate => candidate.id === object.id) as UIComponentObject;
      report(applyUIBuilderComponentConfiguration(editor, [{objectId: object.id, props: {...current.document.props, ...patch}}]));
    };
    const content = <UIComponentSurface key={object.id} inert={editable} object={projection.object} designId={project.designId} issues={projection.issues} collection={projection.collection} renderChildren={ids => ids.map(id => <div key={id} data-ui-child={id} ref={node => {if (node) renderedChildren.current.set(id, node); else renderedChildren.current.delete(id);}}>{renderComponent(id)}</div>)} interaction={{recordIdentity, dismissBoundary: surface, actionUnavailableReason: prerequisites && !prerequisites.ok ? prerequisites.reason : undefined, busy: !!running || actionHasNoSelection || !!object.document.bindings?.some(binding => binding.mode === "value" && !binding.recordId && selection[binding.tableId] === ""), selectedItem: projection.recordIds?.indexOf(rowId ?? "") ?? table?.data.records.findIndex(r => r.id === rowId) ?? -1,
      editing: editable,
      onNavigate: navigate,
      onPropsChange: changeProps,
      onSelectRecord: id => {if (table?.data.records.some(row => row.id === id)) {(onSelectionChange ?? setLocalSelection)({...selection, [table.id]: id}); setMessage("");}},
      onAppendActivity: project.objects.some(candidate=>candidate.id===object.document.props?.targetId && (candidate as UIComponentObject).document.component==="activity-feed") ? body=>report(appendUIBuilderActivity(editor,object.id,body)) : undefined,
      onCollectionChange: document => report(commitUIBuilderCollection(editor, object, document)),
      onItemAction: index => {const actionIds = object.document.props?.actionIds; void run(Array.isArray(actionIds) && typeof actionIds[index] === "string" ? actionIds[index] : undefined);},
      onFiles: files => changeProps({files: files.map(file => ({name: file.name, size: file.size}))}),
      onResize: (delta, phase) => {if (phase === "commit") report(editor.dispatch({type: "object.update", objectId: object.id, changes: object.document.props?.orientation === "vertical" ? {height: Math.max(1, object.height + delta)} : {width: Math.max(1, object.width + delta)}}));},
      onHandle: event => {if (event.phase === "commit") report(editor.dispatch({type: "object.update", objectId: object.id, changes: {x: object.x + event.delta.dx, y: object.y + event.delta.dy}}));},
      onAction: actionId => {
        if (object.document.component !== "page-link") {void run(actionId ?? object.document.actionId); return;}
        navigate(object.document.targetPageId ?? "");
      },
      onValueChange: value => {
        if (typeof object.document.props?.targetTableId === "string") {
          const tableId = object.document.props.targetTableId;
          const nextValues = {...runtimeValues, [object.id]: value};
          const records = resolveUIBuilderTableData(project, tableId, nextValues)?.records ?? [];
          const current = selection[tableId] ?? project.tables.find(table => table.id === tableId)?.data.records[0]?.id;
          (onSelectionChange ?? setLocalSelection)({...selection, [tableId]: records.some(record => record.id === current) ? current! : records[0]?.id ?? ""});
          (onRuntimeValuesChange ?? setLocalRuntimeValues)(nextValues);
          return;
        }
        return report(setUIBuilderComponentValue(editor, object, value, selection));
      },
      onSelectItem: index => {const id = projection.recordIds?.[index] ?? table?.data.records[index]?.id; if (table && id) {(onSelectionChange ?? setLocalSelection)({...selection, [table.id]: id}); setMessage("");}},
    }} />;
    return <UIScreenEditLayer object={previewObjects.find(preview => preview.id === objectId) ?? object} editor={editor} editable={editable} origin={displayedOrigins[objectId]}>{content}</UIScreenEditLayer>;
  }
  return <div className="builder-runtime" aria-label="화면 실행">
    <div ref={surface} className="builder-flow" style={{maxWidth: project.width}} role="group" aria-label={editable ? "편집 화면" : "실행 화면"} data-layout-mode="auto-flow">
      {flow.rows.map((row, index) => <div className="builder-flow-row" key={index} style={{gridTemplateColumns: row.columns.map(c => `minmax(0, ${c.weight}fr)`).join(" ")}}>
        {row.columns.map((column, columnIndex) => <div className="builder-flow-column" data-flow-column key={columnIndex}>
          {column.items.some(item => resolveUIBuilderComponent(project, project.objects.find(object => object.id === item.objectId) as UIComponentObject, selection, runtimeValues).selectionMissing) && <p role="status" className={contentPresentation.caption}>목록에서 항목을 선택하면 상세 정보를 볼 수 있습니다.</p>}
          {(() => {
            // Immediate title/context belongs to one reading group; outer groups keep the column gap.
            const groups: Array<Array<(typeof column.items)[number]>> = [];
            const component = (id: string) => (project.objects.find(object => object.id === id) as UIComponentObject | undefined)?.document?.component;
            for (const item of column.items) {
              const previous = groups.at(-1)?.at(-1);
              const related = previous && ((component(previous.objectId) === "title" && component(item.objectId) === "caption") || (component(previous.objectId) === "caption" && ["heading", "card"].includes(component(item.objectId) ?? "")));
              if (related) groups.at(-1)!.push(item); else groups.push([item]);
            }
            const missing = (item: (typeof column.items)[number]) => resolveUIBuilderComponent(project, project.objects.find(object => object.id === item.objectId) as UIComponentObject, selection, runtimeValues).selectionMissing;
            const renderItem = (item: (typeof column.items)[number]) => <div hidden={missing(item)} className="builder-flow-item" key={item.objectId} data-ui-component-object={item.objectId} data-flow-size={item.size}>{renderComponent(item.objectId)}</div>;
            return groups.map(group => group.length === 1 ? renderItem(group[0]!) : <div className="builder-flow-reading-group" key={group[0]!.objectId} hidden={group.every(missing)}>{group.map(renderItem)}</div>);
          })()}
        </div>)}
      </div>)}
      {editable && Object.keys(displayedOrigins).length > 0 && <CanvasHand editor={editor} collisionGroups={flow.rows.flatMap(row => row.columns.map(column => ({objectIds: column.items.map(item => item.objectId).filter(id => displayedOrigins[id]), gap: flowGap})))} objectIds={pageObjects.filter(object => displayedOrigins[object.id]).map(object => object.id)} screenOverlay={{...screenSize, onObjectsChange: previewChanged}} creationStyle={{color: "transparent", textColor: "#222222", fontSize: 16, strokeWidth: 1}} creationTools={[]} documentControls={false} contentToolbar={false} renderEmbedded={() => null} label="화면 편집 Canvas" />}
    </div>
    {(running || message) && <div className={`${floatingSurface.control} builder-runtime-status`} role={failed ? "alert" : "status"}>
      <span>{running ? `${running} 중…` : message}</span>
      {running ? <Command onClick={() => controller.current?.abort()}>취소</Command> : <Command onClick={() => setMessage("")}>닫기</Command>}
    </div>}
  </div>;
}
