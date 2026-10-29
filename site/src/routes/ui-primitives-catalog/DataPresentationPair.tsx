import {useState, type ReactNode} from "react";
import {AlertCircle} from "lucide-react";
import {ContentGroup, FieldPresentation, Command, Toolbar, PageHeader, Field, EditableText, DateDisplay, DateRangeDisplay, StatusBadge, PeoplePicker, PersonIdentity, PriorityIndicator, Choice, NumberField, RecordFacts, IssueRow, ActivityFeed, CommentComposer, ContentCard, QuantityDisplay, MoneyDisplay, Tag, TagGroup, TagPicker, contentPresentation, type ActivityEntry, type DataPresentationRole} from "@interactive-os/json-document-ui-primitives-react";
import {DatePicker, DateRangePicker} from "@interactive-os/json-document-calendar";
import {DatabaseHand} from "@interactive-os/json-document-database";
import type {DatabaseDocument} from "@interactive-os/json-document-editing";

const people=[{id:"person-minji-cx",name:"김민지",description:"고객 경험"},{id:"person-minji-design",name:"김민지",description:"제품 디자인"},{id:"person-seoyeon",name:"박서연",description:"개발"}];
const tagOptions=[{id:"export",label:"내보내기"},{id:"encoding",label:"인코딩"},{id:"customer",label:"고객 문의"}];
const initialTable:DatabaseDocument={schema:{properties:[{id:"name",name:"상품",type:"title",options:[]},{id:"stock",name:"재고",type:"number",options:[]}]},records:[{id:"keyboard",values:{name:"무선 키보드",stock:0}},{id:"mouse",values:{name:"무선 마우스",stock:12}}],views:[{id:"comparison",name:"상품 비교",ownership:"personal",layout:"table",projection:{search:"",filter:{id:"all",conjunction:"and",items:[]},sorts:[],groups:[],columns:["name","stock"].map(propertyId=>({propertyId,visible:true,width:null,pinned:null}))}}]};
/** Fixtures only: table behavior, commands, validation and keyboard editing belong to DatabaseHand. */
function TablePair() {
  const [document,setDocument]=useState(initialTable);
  return <Comparison readApi="DatabaseHand (readOnly)" writeApi="DatabaseHand" read={<DatabaseHand document={document} viewId="comparison" readOnly presentation={{showRecordIds:false,showPropertyTypes:false}} features={{create:false,delete:false,history:false,filter:false,columns:false}} labels={{ariaLabel:"상품 비교 · 읽기"}}/>} write={<DatabaseHand document={document} viewId="comparison" onDocumentChange={setDocument} presentation={{showRecordIds:false,showPropertyTypes:false}} features={{create:false,delete:false,history:false,filter:false,columns:false}} labels={{ariaLabel:"상품 비교 · 편집"}}/>}/>;
}
function Comparison({readApi,writeApi,read,write}: {readApi:string;writeApi?:string;read:ReactNode;write:ReactNode}) {
  return <section aria-label="읽기와 쓰기 비교" className="grid min-w-0 gap-group">
    <div className="grid min-w-0 border-y border-line-subtle md:grid-cols-2">
      <section aria-label="읽기 표현" className="grid min-w-0 content-start gap-group p-group md:border-r md:border-line-subtle"><header className={contentPresentation.group}><h4 className={contentPresentation.itemTitle}>읽기</h4><p className={contentPresentation.caption}>{readApi}</p></header><div className="min-w-0">{read}</div></section>
      <section aria-label="쓰기 표현" className="grid min-w-0 content-start gap-group border-t border-line-subtle p-group md:border-t-0"><header className={contentPresentation.group}><h4 className={contentPresentation.itemTitle}>쓰기</h4><p className={contentPresentation.caption}>{writeApi??"읽기 전용"}</p></header><div className="min-w-0">{write}</div></section>
    </div>
    {writeApi && <p className={contentPresentation.caption}>같은 샘플 값을 공유합니다. 쓰기 표현을 조작하면 읽기 표현에도 반영됩니다.</p>}
  </section>;
}
/** The exhaustive role map renders the APIs named by the catalog, using one shared fixture value. */
export function DataPresentationPair({role,readApi,writeApi}: {role:DataPresentationRole;readApi:string;writeApi?:string}) {
  const [text,setText]=useState("CSV 인코딩 확인");
  const [date,setDate]=useState("2026-10-15");
  const [choice,setChoice]=useState(role==="priority"?"높음":role==="severity"?"중대":role==="category"?"제품":"검토");
  const [person,setPerson]=useState(people[0]!.id);
  const [quantity,setQuantity]=useState<number|null>(12);
  const [money,setMoney]=useState<number|null>(12500);
  const [tags,setTags]=useState<readonly string[]>(["export","encoding"]);
  const [range,setRange]=useState({start:"2026-10-15",end:"2026-10-19"});
  const [entries,setEntries]=useState<readonly ActivityEntry[]>([]);
  const [records,setRecords]=useState([{id:"TEAM-101",title:"CSV 인코딩 확인"},{id:"TEAM-102",title:"금요일 배포 공지"}]);
  const [selected,setSelected]=useState("TEAM-101");
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState({text,date,choice,person});
  const canEdit=["title","date","status","person"].includes(role);
  const editLabel=role === "title" ? "업무 제목" : role === "date" ? "마감일" : role === "status" ? "처리 상태" : "담당자";
  const beginEdit=()=>{setDraft({text,date,choice,person});setEditing(true);};
  const commitEdit=()=>{if(role === "title")setText(draft.text);if(role === "date")setDate(draft.date);if(role === "status")setChoice(draft.choice);if(role === "person")setPerson(draft.person);setEditing(false);};
  const statusOptions=["대기","진행","검토","완료","차단"].map(label=>({id:label,label}));
  const personValue=people.find(p=>p.id===person)!;
  const personRead=<ContentGroup relationship="related"><PersonIdentity name={personValue.name}/><span className={contentPresentation.caption}>{personValue.description} · {personValue.id}</span></ContentGroup>;
  const statusRead=<StatusBadge tone={choice === "완료" ? "success" : choice === "차단" ? "attention" : choice === "대기" ? "neutral" : "active"} icon={choice==="차단"?<AlertCircle size={16} aria-hidden="true"/>:undefined}>{choice}</StatusBadge>;
  const samples:Record<DataPresentationRole,{read:ReactNode;write:ReactNode}>={
    title:{read:<PageHeader level={2} title={text}/>,write:<Field label="대상 이름 샘플" value={text} onValueChange={setText}/>},
    description:{read:<p className={contentPresentation.body}>{text}</p>,write:<Field multiline label="설명 샘플" value={text} onValueChange={setText}/>},
    identifier:{read:<span className={contentPresentation.caption}>TEAM-101</span>,write:<span className={contentPresentation.caption}>읽기 전용</span>},
    status:{read:statusRead,write:<Choice label="상태 샘플" presentation="popup" value={choice} options={statusOptions} onValueChange={setChoice}/>},
    priority:{read:<PriorityIndicator label={choice} level={choice === "높음" ? "high" : choice === "낮음" ? "low" : "normal"}/>,write:<Choice label="우선순위 샘플" presentation="popup" value={choice} options={["낮음","보통","높음"].map(label=>({id:label,label}))} onValueChange={setChoice}/>},
    severity:{read:<StatusBadge tone={choice==="경미"?"neutral":"attention"} icon={<AlertCircle size={16} aria-hidden="true"/>}>{choice}</StatusBadge>,write:<Choice label="심각도 샘플" presentation="popup" value={choice} options={["경미","중대","치명"].map(label=>({id:label,label}))} onValueChange={setChoice}/>},
    person:{read:personRead,write:<PeoplePicker label="인물 샘플" people={people} value={person} onValueChange={setPerson}/>},
    date:{read:<DateDisplay value={date}>{date}</DateDisplay>,write:<DatePicker label="날짜 샘플" chooseLabel="날짜 선택" value={date} onValueChange={setDate}/>},
    "date-range":{read:<DateRangeDisplay start={range.start} end={range.end}/>,write:<DateRangePicker label="기간 샘플" value={range} onValueChange={setRange}/>},
    quantity:{read:<QuantityDisplay value={quantity} unit="개"/>,write:<NumberField label="수량 샘플" value={quantity} unit="개" min={0} precision={0} onValueChange={setQuantity}/>},
    money:{read:<MoneyDisplay value={money} currency="KRW"/>,write:<NumberField label="금액 샘플" unit="KRW" min={0} precision={0} value={money} onValueChange={setMoney}/>},
    category:{read:<Tag>{choice}</Tag>,write:<Choice label="분류 샘플" presentation="popup" value={choice} options={["제품","디자인","개발"].map(label=>({id:label,label}))} onValueChange={setChoice}/>},
    tags:{read:<TagGroup label="적용된 분류" items={tagOptions.filter(option=>tags.includes(option.id))}/>,write:<TagPicker label="분류 선택" options={tagOptions} value={tags} onValueChange={setTags}/>},
    properties:{read:<RecordFacts label="속성 읽기 샘플" presentation="list" items={[{id:"owner",label:"담당자",value:personRead},{id:"state",label:"상태",value:statusRead}]}/>,write:<RecordFacts label="속성 쓰기 샘플" presentation="list" items={[{id:"owner",label:"담당자",value:<PeoplePicker label="속성 담당자" people={people} value={person} onValueChange={setPerson}/>},{id:"state",label:"상태",value:<Choice label="속성 상태 샘플" presentation="popup" value={choice} options={statusOptions} onValueChange={setChoice}/>} ]}/>},
    collection:{read:<ul className={contentPresentation.list}>{records.map(record=><li key={record.id}><IssueRow title={record.title} identifier={record.id} selected={selected===record.id} onSelect={()=>setSelected(record.id)}/></li>)}</ul>,write:<ContentGroup relationship="related"><span className={contentPresentation.caption}>{selected}</span><Field label="선택 업무 제목 샘플" value={records.find(record=>record.id===selected)!.title} onValueChange={title=>setRecords(previous=>previous.map(record=>record.id===selected?{...record,title}:record))}/></ContentGroup>},
    comparison:{read:null,write:null},
    activity:{read:<ActivityFeed label="기록 읽기 샘플" entries={entries} empty={<span className={contentPresentation.caption}>기록 없음</span>}/>,write:<CommentComposer label="기록 추가 샘플" onSubmit={text=>{const now=new Date();setEntries(previous=>[...previous,{id:crypto.randomUUID(),actor:"김민지",action:"메모를 남겼습니다.",dateTime:now.toISOString(),timeLabel:now.toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"}),detail:text}]);}}/>},
    result:{read:<ContentCard title="브리핑"><p className={contentPresentation.body}>재현 조건을 확인하고 담당자와 처리 일정을 합의합니다.</p></ContentCard>,write:<span className={contentPresentation.caption}>생성 명령으로 작성하는 결과입니다.</span>},
  };
  const {read,write}=samples[role];
  const editField=role === "title" ? <Field label="업무 제목" value={draft.text} onValueChange={text=>setDraft(previous=>({...previous,text}))}/> : role === "date" ? <DatePicker label="마감일" chooseLabel="날짜 선택" value={draft.date} onValueChange={date=>setDraft(previous=>({...previous,date}))}/> : role === "status" ? <Choice label="처리 상태" presentation="popup" value={draft.choice} options={statusOptions} onValueChange={choice=>setDraft(previous=>({...previous,choice}))}/> : <PeoplePicker label="담당자" people={people} value={draft.person} onValueChange={person=>setDraft(previous=>({...previous,person}))}/>;
  return <ContentGroup relationship="region">
    {role==="comparison" ? <TablePair/> : <Comparison read={read} write={write} readApi={readApi} writeApi={writeApi}/>}
    {role==="description" && <ContentGroup relationship="group"><h4 className={contentPresentation.itemTitle}>읽기에서 수정으로</h4><EditableText label="요청 내용" value={text} onCommit={setText}/></ContentGroup>}
    {canEdit && <ContentGroup label="실제 편집 흐름" relationship="group"><header className={contentPresentation.group}><h4 className={contentPresentation.itemTitle}>읽기에서 수정으로</h4><p className={contentPresentation.caption}>값 옆의 편집을 눌러 변경하고 저장하거나 취소하세요.</p></header><FieldPresentation label={editLabel} mode={editing ? "edit" : "read"} onEditRequest={beginEdit} read={role === "title" ? <span className={contentPresentation.body}>{text}</span> : read} edit={<>{editField}<Toolbar label="샘플 편집"><Command kind="primary" onClick={commitEdit}>저장</Command><Command onClick={()=>setEditing(false)}>취소</Command></Toolbar></>}/></ContentGroup>}
  </ContentGroup>;
}
