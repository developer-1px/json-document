import {useId, useState} from "react";
import {PanelRight, ChevronDown} from "lucide-react";
import {ContentGroup, RecordDetail, FieldPresentation, contentPresentation, PageHeader, FilterBar, IssueRow, StatusBadge, PersonIdentity, PeoplePicker, PriorityIndicator, DateDisplay, RecordFacts, ProductInspector, EmptyState, ExecutionFeedback, ActivityFeed, CommentComposer, Search, Choice, Command, DisclosureButton, RecordWorkspace, Toolbar, SemanticIcon, StateIndicator, type ActivityEntry} from "@interactive-os/json-document-ui-primitives-react";

const people = [{id:"minji",name:"김민지"},{id:"junho",name:"이준호"},{id:"seoyeon",name:"박서연"}];
const tasks = [
  {id:"TEAM-101",title:"CSV 내보내기에서 한글이 깨져요",summary:"Excel에서 고객 이름이 깨집니다.",body:"Windows Excel에서 고객 목록 CSV를 열면 한글 이름이 깨집니다. 웹에서는 정상적으로 표시됩니다. 다음 고객 보고 전에 재현 조건과 내보내기 인코딩을 확인해야 합니다.",owner:"minji",state:"검토",planTitle:"인코딩 문제 확인 계획",planSummary:"웹과 Excel의 차이를 재현하고, 확인된 내보내기 설정으로 고객에게 안내합니다.",steps:[{title:"같은 파일로 재현",body:"고객 목록 CSV를 웹과 Windows Excel에서 열어 한글 이름의 표시 차이를 확인합니다."},{title:"내보내기 설정 확인",body:"파일의 인코딩과 Excel에서 여는 방법을 비교하고 정상적으로 표시되는 조건을 정리합니다."},{title:"확인 결과 안내",body:"재현 조건과 권장 내보내기 방법을 고객에게 안내합니다. 확인 전에는 해결됐다고 알리지 않습니다."}],reply:"문의 주신 고객 목록 CSV의 한글 표시 문제를 확인하고 있습니다. Windows Excel에서 여는 조건과 내보내기 설정을 비교한 뒤 확인 결과와 이용 방법을 안내드리겠습니다."},
  {id:"TEAM-102",title:"금요일 배포 공지를 준비해주세요",summary:"검색 개선과 알림 수정 내용을 안내합니다.",body:"금요일 배포에 포함되는 검색 개선과 알림 수정 내용을 고객에게 안내합니다. 변경 사항과 고객이 확인해야 할 내용을 정리해 주세요.",owner:"junho",state:"진행",planTitle:"금요일 배포 안내 계획",planSummary:"실제 배포 변경 사항을 확인하고 고객이 알아야 할 내용을 공지로 정리합니다.",steps:[{title:"배포 범위 확인",body:"검색 개선과 알림 수정 중 금요일 배포에 실제로 포함되는 변경을 확인합니다."},{title:"고객 영향 정리",body:"바뀌는 동작과 고객이 확인할 내용을 구분해 공지 초안을 작성합니다."},{title:"공지 내용 검토",body:"담당자와 변경 내용을 대조한 뒤 확정된 공지를 준비합니다."}],reply:"금요일 배포에 포함되는 검색 개선과 알림 수정 내용을 정리하고 있습니다. 확정된 변경 사항과 고객이 확인할 내용을 검토한 뒤 공지하겠습니다."},
];
type Direction = "plan" | "reply";
type RunState = "idle" | "running" | "error" | "complete";

/** Fixture response ports and product policy only; composition and behavior use public owners. */
export function ProductWorkflowSpecimen() {
  const notesId = useId();
  const sourceId = useId();
  const activityId = useId();
  const propertiesId = useId();
  const [query,setQuery] = useState("");
  const [filter,setFilter] = useState(false);
  const [selected,setSelected] = useState(tasks[0]!.id);
  const [ownerByTask,setOwnerByTask] = useState<Record<string,string>>({});
  const [editingOwner,setEditingOwner] = useState(false);
  const [draftOwner,setDraftOwner] = useState(tasks[0]!.owner);
  const [panelOpen,setPanelOpen] = useState(false);
  const [notesOpen,setNotesOpen] = useState(false);
  const [sourceOpen,setSourceOpen] = useState(false);
  const [historyOpen,setHistoryOpen] = useState(false);
  const [directionByTask,setDirectionByTask] = useState<Record<string,Direction>>({});
  const [runByTask,setRunByTask] = useState<Record<string,RunState>>({});
  const [requestedDirection,setRequestedDirection] = useState<Record<string,Direction>>({});
  const [resultsByTask,setResultsByTask] = useState<Record<string,Direction>>({});
  const [recordedByTask,setRecordedByTask] = useState<Record<string,boolean>>({});
  const [activityByTask,setActivityByTask] = useState<Record<string,ActivityEntry[]>>({});
  const task = tasks.find(task=>task.id===selected)!;
  const owner = ownerByTask[selected] ?? task.owner;
  const person = people.find(person=>person.id===owner)!;
  const visible = tasks.filter(task=>task.title.includes(query)&&(!filter||task.state==="검토"));
  const entries = activityByTask[selected] ?? [];
  const run = runByTask[selected] ?? "idle";
  const direction = directionByTask[selected] ?? "plan";
  const setDirection = (value:Direction) => setDirectionByTask(previous=>({...previous,[selected]:value}));
  const result = resultsByTask[selected];
  const setRun = (value:RunState) => setRunByTask(previous=>({...previous,[selected]:value}));
  const execute = () => {setRequestedDirection(previous=>({...previous,[selected]:direction}));setRun("running");};
  const addActivity = (action:string, detail:string) => setActivityByTask(previous=>({...previous,[selected]:[...(previous[selected] ?? []),{id:crypto.randomUUID(),actor:person.name,action,dateTime:new Date().toISOString(),timeLabel:"방금",detail}]}));
  const resetResult = () => {setResultsByTask(previous=>{const next={...previous};delete next[selected];return next;});setRecordedByTask(previous=>({...previous,[selected]:false}));setRun("idle");setSourceOpen(false);};
  const notes = <ContentGroup relationship="group">
    {result && <ContentGroup relationship="group"><DisclosureButton expanded={sourceOpen} controls={sourceId} onClick={()=>setSourceOpen(value=>!value)}><span>원래 요청</span></DisclosureButton><div id={sourceId} hidden={!sourceOpen}><p className={contentPresentation.body}>{task.body}</p></div></ContentGroup>}
    <DisclosureButton expanded={notesOpen} controls={notesId} onClick={()=>setNotesOpen(value=>!value)}><span>메모 남기기</span></DisclosureButton>
    <div id={notesId} hidden={!notesOpen}><CommentComposer identity={selected} label="작업 메모" submitLabel="메모 저장" onSubmit={text=>{addActivity("메모를 남겼습니다.",text);setNotesOpen(false);}}/></div>
    {entries.length>0 && <ContentGroup relationship="group"><DisclosureButton expanded={historyOpen} controls={activityId} onClick={()=>setHistoryOpen(value=>!value)}><span>활동 {entries.length}</span></DisclosureButton><div id={activityId} hidden={!historyOpen}><ActivityFeed label="업무 활동" presentation="timeline" entries={entries}/></div></ContentGroup>}
  </ContentGroup>;
  const detail = <ContentGroup relationship="region">
    {result ? <>
      <RecordDetail actions={<><Command kind="primary" disabled={recordedByTask[selected] === true} onClick={()=>{addActivity(result === "plan" ? "진행 계획을 기록했습니다." : "답변 초안을 기록했습니다.",result === "plan" ? task.steps.map(step=>`${step.title}: ${step.body}`).join("\n") : task.reply);setRecordedByTask(previous=>({...previous,[selected]:true}));}}><SemanticIcon kind={recordedByTask[selected] ? "complete" : "result"}/>{recordedByTask[selected] ? "기록됨" : result === "plan" ? "계획 기록" : "초안 기록"}</Command><Command onClick={resetResult}>다시 만들기</Command></>}>
        {result === "plan" ? <ContentGroup relationship="region"><p className={contentPresentation.body}>{task.planSummary}</p><ol className={`${contentPresentation.list} ${contentPresentation.group}`}>{task.steps.map(step=><li key={step.title}><ContentGroup relationship="related"><h3 className={contentPresentation.itemTitle}>{step.title}</h3><p className={contentPresentation.body}>{step.body}</p></ContentGroup></li>)}</ol></ContentGroup> : <p className={contentPresentation.body}>{task.reply}</p>}
      </RecordDetail>
    </> : <RecordDetail>
      <p className={contentPresentation.body}>{task.body}</p>
      <div className="flex flex-wrap items-center gap-related"><Choice label="브리핑 종류" presentation="popup" value={direction} disabled={run==="running"} onValueChange={setDirection} options={[{id:"plan",label:"진행 계획"},{id:"reply",label:"답변 초안"}]}/>{run !== "error" && <Command kind="primary" onClick={execute} disabled={run==="running"}><SemanticIcon kind="result"/>브리핑 만들기</Command>}</div>
      <ExecutionFeedback state={run} label={run==="running"?"브리핑을 만들고 있습니다":run==="error"?"브리핑을 만들지 못했습니다":"브리핑 작성 완료"} description={run==="error"?"연결을 확인하고 다시 시도해 주세요.":undefined} onCancel={()=>setRun("idle")} onRetry={execute}/>
    </RecordDetail>}
    {notes}
  </ContentGroup>;
  return <ContentGroup relationship="group">
    <RecordWorkspace
      header={<Toolbar label="업무 인박스"><h1 className={contentPresentation.itemTitle}>업무 인박스</h1><span className={contentPresentation.caption}>MOCK</span></Toolbar>}
      listHeader={<><Search label="업무 검색" query={query} onQueryChange={setQuery}/><FilterBar label="업무 필터" filters={filter?[{id:"review",label:"검토"}]:[]} onRemove={()=>setFilter(false)} onReset={()=>{setFilter(false);setQuery("");}} resultCount={visible.length}><Command onClick={()=>setFilter(value=>!value)}>검토 업무</Command></FilterBar></>}
      list={visible.length ? <ul className={contentPresentation.list}>{visible.map(item=><li key={item.id}><IssueRow title={item.title} indicators={runByTask[item.id] === "running" ? <StateIndicator state="running" label="브리핑 작성 중"/> : resultsByTask[item.id] ? <SemanticIcon kind="result" label="브리핑 있음"/> : undefined} summary={item.summary} identifier={item.id} status={<StatusBadge tone={item.state === "검토" ? "neutral" : "active"}>{item.state}</StatusBadge>} assignee={people.find(person=>person.id===(ownerByTask[item.id] ?? item.owner))!.name} selected={selected===item.id} onSelect={()=>{setSelected(item.id);setEditingOwner(false);setNotesOpen(false);setSourceOpen(false);setHistoryOpen(false);}}/></li>)}</ul> : <EmptyState title="검색 결과가 없습니다" description="검색어나 필터를 바꿔보세요." actions={<Command onClick={()=>{setQuery("");setFilter(false);}}>조건 초기화</Command>}/>}
      detailHeader={<PageHeader level={2} titleRole="primary" title={result ? result === "plan" ? task.planTitle : "고객에게 보낼 답변 초안" : task.title} identifier={result ? `${task.id} · ${task.title}` : task.id} status={result ? undefined : <StatusBadge>{task.state}</StatusBadge>} description={!panelOpen ? <>담당 {person.name} · 마감 <DateDisplay value="2026-10-15">10월 15일</DateDisplay></> : undefined} actions={<Command label="업무 속성" aria-expanded={panelOpen} aria-controls={propertiesId} onClick={()=>setPanelOpen(value=>!value)}><PanelRight size={16} aria-hidden="true"/></Command>}/>}
      detail={detail}
      properties={panelOpen ? <ProductInspector id={propertiesId} heading="속성" aria-label="업무 속성" onClose={()=>setPanelOpen(false)}><ContentGroup relationship="group"><FieldPresentation label="담당자" mode={editingOwner?"edit":"read"} onEditRequest={()=>{setDraftOwner(owner);setEditingOwner(true);}} read={<PersonIdentity name={person.name}/>} edit={<><PeoplePicker label="담당자" people={people} value={draftOwner} onValueChange={setDraftOwner}/><Command onClick={()=>{setOwnerByTask(previous=>({...previous,[selected]:draftOwner}));setEditingOwner(false);}}>저장</Command><Command onClick={()=>setEditingOwner(false)}>취소</Command></>}/><RecordFacts presentation="list" label="읽기 속성" items={[{id:"priority",label:"우선순위",value:<PriorityIndicator level="high" label="높음"/>},{id:"due",label:"마감일",value:<DateDisplay value="2026-10-15">10월 15일</DateDisplay>}]}/></ContentGroup></ProductInspector> : undefined}
    />
    {run==="running" && <Toolbar label="카탈로그 MOCK 응답"><span className={contentPresentation.caption}>카탈로그용 MOCK 응답</span><Command onClick={()=>setRun("error")}>실패 응답</Command><Command onClick={()=>{setResultsByTask(previous=>({...previous,[selected]:requestedDirection[selected] ?? "plan"}));setRun("complete");}}>성공 응답</Command></Toolbar>}
  </ContentGroup>;
}
