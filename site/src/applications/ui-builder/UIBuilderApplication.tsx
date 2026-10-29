import { FolderOpen, ChevronDown } from "lucide-react";
import { createIssueFeedExample } from "./issue-feed-example";
import { issueFeedMockSkills } from "./issue-feed-skills";
import { createBriefingStudioExample } from "./briefing-studio-example";
import { createIssueWorkbenchExample } from "./issue-workbench-example";
import { createFullCatalogExample } from "./full-catalog-example";
import {createDomainCardExample} from "./domain-card-example";
import "@interactive-os/json-document-calendar/calendar-presentation.css";
import "@interactive-os/json-document-animation-react/styles.css";
import "./ui-builder-application.css";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createUIBuilderEditor, createUIBuilderScreenTools, createUIBuilderLayoutTools,  applyUIBuilderConfiguration, readUIBuilderProject, getUIBuilderPageObjects, getUIBuilderRootObjects, type UIBuilderConfiguration, type UIBuilderRuntimeValues, type UIBuilderRecordSelection, type ObjectEditor } from "@interactive-os/json-document-editing";
import { assertUIBuilderDocument, resolveUIFlowLayout } from "@interactive-os/json-document-object-document";
import { UIBuilderWorkspace, UIBuilderStorageControls, createFakerSampleGenerator, resolveUIBuilderProjectLocation, uiBuilderPageLink, newUIBuilderProjectLink, type UIBuilderProjectLocation } from "@interactive-os/json-document-ui-builder";
import "@interactive-os/json-document-ui-builder/ui-builder-workspace.css";
import "@interactive-os/json-document-database/styles.css";
import { openWebStoredDocument, createWebIndexedDBStorage, type WebStoredDocument } from "@interactive-os/json-document-web";
import {dataPresentationCatalog, Command, Popover, floatingSurface } from "@interactive-os/json-document-ui-primitives-react";
import { builderDomainExamples, createBuilderDomainExample, type BuilderDomainExample } from "./domain-examples";
import { createBriefingExample, briefingMockSkills } from "./briefing-example";
import { streamLlmAgentTurn } from "../../app/llm-agent-api";
import { createAgentChatSession, agentChatErrorReason, type AgentChatSession } from "../../app/agent-chat-session";
import { EditorAgentChat } from "../../app/EditorAgentChat";
import "@interactive-os/json-document-canvas/canvas-hand.css";
import "@interactive-os/json-document-canvas/ui-builder.css";

export function UIBuilderApplication() {
  const [location] = useState(() => resolveUIBuilderProjectLocation(window.location.href, () => crypto.randomUUID()));
  const example = location.example;
  useEffect(() => {window.history.replaceState(null, "", location.url);}, [location.url]);
  const [stored, setStored] = useState<WebStoredDocument<ObjectEditor> | null>(null);
  useEffect(() => {
    let active = true;
    void openWebStoredDocument({
    key: location.storageKey, storage: createWebIndexedDBStorage("json-document-projects"), legacyStorage: () => window.localStorage,
    create: () => example === "issues" ? createIssueWorkbenchExample() : example === "issue-feed" ? createIssueFeedExample() : example === "briefing-studio" ? createBriefingStudioExample() : example === "catalog" ? createFullCatalogExample() : example === "domain-cards" ? createDomainCardExample() : (example === "briefing" || example === "briefing-pages") ? createBriefingExample() : builderDomainExamples.includes(example as BuilderDomainExample) ? createBuilderDomainExample(example as BuilderDomainExample) : createUIBuilderEditor({ profile: "canvas/1", width: 1200, height: 900, objects: [] }),
    restore: value => { assertUIBuilderDocument(value); return createUIBuilderEditor(value); },
    }).then(value => {if (active) setStored(value);});
    return () => {active = false;};
  }, [example]);
  if (!stored) return <main className="p-region" role="status">저장한 문서를 불러오는 중…</main>;
  return <UIBuilderProjectApplication stored={stored} example={example} location={location} />;
}
function UIBuilderProjectApplication({stored, example, location}: {stored: WebStoredDocument<ObjectEditor>; example: string; location: UIBuilderProjectLocation}) {
  const editor = stored.source;
  const skills = example === "issues" ? [] : example === "issue-feed" ? issueFeedMockSkills : briefingMockSkills;
  const [pageId, setPageId] = useState(location.pageId ?? readUIBuilderProject(editor.snapshot.value).activePageId);
  useEffect(() => {const update = () => setPageId(new URL(window.location.href).searchParams.get("page") ?? readUIBuilderProject(editor.snapshot.value).activePageId); window.addEventListener("popstate", update); return () => window.removeEventListener("popstate", update);}, [editor]);
  function navigatePage(id: string) {setPageId(id); const url = uiBuilderPageLink(window.location.href, id); if (url !== window.location.href) window.history.pushState(null, "", url);}
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const saveState = useSyncExternalStore(stored.subscribe, () => stored.state);
  useEffect(() => stored.connect(), [stored]);
  const [generateSamples] = useState(() => createFakerSampleGenerator());

  const chatId = location.projectId.startsWith("legacy:") ? example ? `ui-builder-${example}-chat` : "ui-builder-chat" : `ui-builder-project-${location.projectId}-chat`;
  const [chatSession] = useState(() => createAgentChatSession(chatId));
  async function arrange(signal: AbortSignal, context?: {pageId: string; selection: UIBuilderRecordSelection; runtimeValues?: UIBuilderRuntimeValues}) {
    const currentChat = chatSession.source.snapshot.value as AgentChatSession;
    if (currentChat.messages.some(message => message.state === "running")) throw new Error("진행 중인 대화가 끝난 뒤 배치를 적용해 주세요.");
    const index = currentChat.messages.length;
    let reply = "";
    const update = (changes: Partial<import("../../app/agent-chat-session").AgentChatMessage>) => chatSession.source.update(current => ({...current, messages: current.messages.map((message, i) => i === index ? {...message, ...changes} : message)}));
    chatSession.source.update(current => ({...current, messages: [...current.messages, {prompt: "편집한 배치의 의도를 읽고 실행 화면으로 정리해 주세요. 왜 그렇게 배치했는지도 설명해 주세요.", reply: "", state: "running"}]}));
    try {
    const observed = editor.snapshot.value;
    // AI may retry or fail after a successful tool call. Keep all such writes isolated.
    const staging = createUIBuilderEditor(readUIBuilderProject(observed));
    const pageId = context?.pageId ?? readUIBuilderProject(observed).activePageId;
    const selection = {...context?.selection};
    let applied = false;
    const layoutTools = createUIBuilderLayoutTools(staging, {pageId, selection, runtimeValues: {...context?.runtimeValues}}).map(tool => ({...tool, execute: (args: unknown) => {
      if (signal.aborted) return {ok: false, reason: "정리를 취소했습니다."};
      if (editor.snapshot.value !== observed) return {ok: false, reason: "정리 중 화면이 바뀌었습니다. 현재 편집 화면에서 다시 정리해 주세요."};
      const result = tool.execute(args);
      if (tool.name === "arrange_ui_builder" && result.ok) applied = true;
      return result;
    }}));
    await streamLlmAgentTurn({prompt: "실행 중이던 화면을 그대로 자유 편집한 초안을 실제 자동 흐름으로 정리해 주세요. 먼저 전용 도구로 현재 표시 중인 페이지, 선택된 업무의 데이터와 실행 결과, 요소의 현재 위치와 크기를 읽으세요. 좌표와 크기는 사용자가 표현한 그룹·순서·비중의 의도입니다. 자유 편집 결과는 의도 전달용 초안이지 제품에 그대로 쓸 배치가 아닙니다. 최종 위치와 크기에서 그룹·읽는 순서·강조·상대 비중을 해석하고, 겹침·불규칙한 간격·사용하기 어려운 크기는 기존 디자인 시스템과 허용된 조합으로 바로잡아 실행 구성을 다시 만드세요. 임시 transform이나 픽셀 좌표를 제품 레이아웃으로 복사하지 마세요. 콘텐츠 결정 → 기존 컴포넌트 매핑 → 관련 데이터 그룹핑과 배치 → 최소 정보성 문구 → 섹션 재배치 순서를 지키세요. 기존 컴포넌트와 허용된 조합만 사용하세요. 데이터, 입력값, 실행 결과, 연결, 페이지와 요소는 수정하지 말고 행·열 묶음과 기존 조합 안의 자식 읽는 순서만 결정하세요. rootObjectIds만 최상위 흐름에 배치하고 중첩 자식은 childOrders로 같은 부모·슬롯 안에서만 순서를 정돈하세요. 제목·본문·카드의 높이는 내용에 맞게 hug하고 버튼은 너비도 hug하세요. 절대 좌표나 고정 높이를 만들지 말고 현재 페이지의 모든 요소를 포함한 자동 흐름을 한 번 적용하세요. 읽은 편집 의도와 재배치할 방향을 먼저 사용자에게 짧게 설명하세요. 배치 도구가 성공하면 어떤 요소를 묶거나 순서를 바꿨는지, 비중과 간격을 왜 그렇게 정했는지 실제 적용 결과에 근거해 한국어로 2~4문장 설명하세요. 내부 추론 대신 사용자에게 필요한 배치 결정의 근거를 말하세요.", mode: "chat", tools: layoutTools, sessionId: null, onSession: () => {}, write: delta => {reply += delta; update({reply});}, signal});
    if (signal.aborted) throw new Error("정리를 취소했습니다.");
    if (editor.snapshot.value !== observed) throw new Error("정리 중 화면이 바뀌었습니다. 현재 편집 화면에서 다시 정리해 주세요.");
    if (!applied) throw new Error("AI가 배치를 적용하지 못했습니다. 다시 눌러 주세요.");
    const staged = readUIBuilderProject(staging.snapshot.value);
    const pageObjects = getUIBuilderRootObjects(getUIBuilderPageObjects(staged, pageId) as readonly import("@interactive-os/json-document-object-document").UIComponentObject[]);
    const flow = resolveUIFlowLayout(pageObjects, staged.flow);
    const original = readUIBuilderProject(observed);
    const childOrders: NonNullable<UIBuilderConfiguration["childOrders"]>[number][] = [];
    for (const raw of getUIBuilderPageObjects(staged, pageId)) {
      const object = raw as import("@interactive-os/json-document-object-document").UIComponentObject;
      const previous = original.objects.find(candidate => candidate.id === object.id) as typeof object;
      for (const slot of ["childIds", "toolbarIds", "inspectorIds"] as const) {
        const nextIds = slot === "childIds" ? object.document.childIds : object.document.props?.[slot];
        const previousIds = slot === "childIds" ? previous.document.childIds : previous.document.props?.[slot];
        if (Array.isArray(nextIds) && JSON.stringify(nextIds) !== JSON.stringify(previousIds)) childOrders.push({objectId: object.id, slot, objectIds: nextIds as string[]});
      }
    }
    const result = applyUIBuilderConfiguration(editor, {flow, pageId, childOrders});
    if (!result.ok) throw new Error(result.reason ?? "정리한 배치를 적용하지 못했습니다.");
    update({state: "complete"});
    } catch (error) {
      update(signal.aborted ? {state: "interrupted", reply: `${reply}\n\n정리를 취소해 편집 초안을 유지했습니다.`} : {state: "error", error: agentChatErrorReason(error)});
      throw error;
    }
  }
  return <main aria-label="UI 빌더" className="ui-builder-application relative h-dvh w-full overflow-hidden bg-background-canvas">
    <UIBuilderWorkspace pageId={pageId} onPageChange={navigatePage} editor={editor} generateSamples={generateSamples} skills={skills} arrange={arrange} initialTab={example ? "run" : "screen"} status={<UIBuilderStorageControls editor={editor} state={saveState} retry={() => void stored.save()} />} navigation={<Popover label="프로젝트 메뉴" open={projectMenuOpen} onOpenChange={setProjectMenuOpen} trigger={<><FolderOpen size={16} aria-hidden="true" />{example === "issue-feed" ? "업무 피드" : example === "briefing-studio" ? "브리핑 스튜디오" : "프로젝트"}<ChevronDown size={14} aria-hidden="true" /></>} panelClassName={`${floatingSurface.panel} builder-catalog-panel`}>
      <div className="builder-binding-fields">
        <h3>프로젝트</h3>
        <Command onClick={() => window.location.assign(newUIBuilderProjectLink(window.location.href))}>새 프로젝트</Command>
        <Popover label="예제로 시작" trigger="예제로 시작" open={examplesOpen} onOpenChange={setExamplesOpen} panelClassName={`${floatingSurface.panel} builder-catalog-panel`}>{[{id:"issues",label:"이슈 관리"},{id:"issue-feed",label:"업무 피드"},{id:"briefing-studio",label:"브리핑 스튜디오"},{id:"briefing-pages",label:"업무 브리핑"},{id:"support",label:"고객 문의"},{id:"inventory",label:"상품 재고"},{id:"domain-cards",label:"도메인 카드"},{id:"catalog",label:"전체 컴포넌트"}].map(item => <Command key={item.id} onClick={() => window.location.assign(newUIBuilderProjectLink(window.location.href, item.id))}>{item.label}</Command>)}</Popover>
      </div>
    </Popover>} />
    <EditorAgentChat session={chatSession} initialExpanded={false} tools={() => createUIBuilderScreenTools(editor, {pageId, dataPresentations: dataPresentationCatalog})} id={chatId} label="UI 디자인 도우미" logLabel="디자인 대화" inputLabel="UI 편집 요청" placeholder="무엇을 만들까요? 정리는 제가 할게요" />
  </main>;
}
