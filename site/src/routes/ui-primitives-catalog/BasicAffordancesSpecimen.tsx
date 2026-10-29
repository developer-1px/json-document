import {useState} from "react";
import {MoreHorizontal} from "lucide-react";
import {basicAffordancesLayout} from "./basic-affordances-styles";
import {Check, Choice, Command, Field, FormField, IssueRow, Menu, NumberField, RecordFacts, SemanticIcon, StateIndicator, StatusBadge, Toolbar, contentPresentation} from "@interactive-os/json-document-ui-primitives-react";

/** Product copy, fixtures and save policy only; field/selection/menu behavior belongs to the public primitives. */
export function InputFieldsSpecimen() {
  const [name, setName] = useState("제품 디자인");
  const [description, setDescription] = useState("팀의 제품 경험과 디자인 시스템을 관리합니다.");
  const [saved, setSaved] = useState({name, description});
  const [touched, setTouched] = useState(false);
  const [limit, setLimit] = useState<number | null>(12);
  return <div className="grid min-w-0 items-start gap-region lg:grid-cols-2">
    <section className={contentPresentation.group} aria-label="팀 설정 폼">
      <h3 className={contentPresentation.itemTitle}>레이블과 도움말, 입력 오류</h3>
      <p className={contentPresentation.caption}>필수 값이 비면 해당 입력에서 오류를 알립니다.</p>
      <form className="grid gap-group" onSubmit={event=>{event.preventDefault();setSaved({name:name.trim(),description});}}>
        <FormField label="팀 이름" required description="사이드바와 팀 목록에 표시됩니다." error={touched && !name.trim() ? "팀 이름을 입력하세요." : undefined}>{control=><Field {...control} label="팀 이름" value={name} pattern={".*\\S.*"} onInvalid={()=>setTouched(true)} onBlur={()=>setTouched(true)} onValueChange={setName}/>}</FormField>
        <FormField label="팀 소개" description="팀이 하는 일을 짧게 설명하세요.">{control=><Field {...control} multiline label="팀 소개" value={description} onValueChange={setDescription}/>}</FormField>
        <Toolbar label="팀 설정 저장"><Command type="submit" kind="primary">변경사항 저장</Command><span role="status" className={contentPresentation.caption}>{name.trim() === saved.name && description === saved.description ? "저장됨" : "저장하지 않은 변경사항"}</span></Toolbar>
      </form>
    </section>
    <section className={contentPresentation.group} aria-label="저장한 설정과 수량 입력">
      <h3 className={contentPresentation.itemTitle}>저장한 값</h3>
      <RecordFacts label="팀 설정 값" presentation="list" items={[{id:"name",label:"팀",value:saved.name},{id:"description",label:"소개",value:saved.description || "소개 없음"}]}/>
      <div className={basicAffordancesLayout.setting}><NumberField label="주간 알림 한도" value={limit} onValueChange={setLimit} min={0} precision={0} unit="회"/><p className={contentPresentation.caption}>0은 알림 없음, 빈 값은 한도 없음입니다. 소수는 입력값을 유지하고 오류를 표시합니다.</p></div>
    </section>
  </div>;
}

const initialRecords = [
  {id:"TEAM-101", title:"CSV 내보내기에서 한글이 깨져요", summary:"Windows Excel에서 고객 이름이 깨집니다.", state:"검토", owner:"김민지", unread:true, attachment:true},
  {id:"TEAM-102", title:"금요일 배포 공지를 준비해주세요", summary:"검색 개선과 알림 수정 내용을 고객에게 안내합니다.", state:"진행", owner:"이준호", unread:false, attachment:false},
  {id:"TEAM-103", title:"신규 사용자 브리핑 흐름 개선", summary:"처음 선택한 업무의 다음 행동을 분명하게 안내합니다.", state:"대기", owner:"박서연", unread:true, attachment:false},
];
const statusOptions = ["대기","진행","검토","완료"].map(label=>({id:label,label}));

export function RecordRowsSpecimen() {
  const [records, setRecords] = useState(initialRecords);
  const [opened, setOpened] = useState("TEAM-101");
  const [checked, setChecked] = useState<readonly string[]>(["TEAM-102"]);
  const current = records.find(record=>record.id === opened)!;
  return <div className="grid min-w-0 items-start gap-region xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
    <section className={contentPresentation.group} aria-label="업무 목록 어포던스">
      <header className={contentPresentation.group}><h3 className={contentPresentation.itemTitle}>목록 탐색과 일괄 선택</h3><p className={contentPresentation.caption}>체크는 일괄 작업의 대상, 행 선택은 오른쪽에 열어 볼 대상입니다.</p></header>
      <Toolbar label="업무 일괄 선택"><label className="flex items-center gap-related"><Check label="업무 모두 선택" checked={checked.length === records.length} indeterminate={checked.length > 0 && checked.length < records.length} onCheckedChange={all=>setChecked(all ? records.map(record=>record.id) : [])}/><span className={contentPresentation.caption}>전체 선택</span></label><span role="status" className={contentPresentation.caption}>{checked.length}개 선택</span><Command disabled={!checked.length} onClick={()=>{setRecords(previous=>previous.map(record=>checked.includes(record.id) ? {...record,unread:false} : record));}}>읽음으로 표시</Command></Toolbar>
      <ul aria-label="업무 목록" className={basicAffordancesLayout.list}>
        {records.map(record=><li key={record.id} className="min-w-0">
          <IssueRow title={record.title} summary={record.summary} identifier={record.id} assignee={record.owner}
            selected={opened === record.id} onSelect={()=>setOpened(record.id)}
            status={<StatusBadge tone={record.state === "완료" ? "success" : record.state === "대기" ? "neutral" : "active"}>{record.state}</StatusBadge>}
            indicators={<>{record.unread && <StateIndicator state="unread" label="읽지 않음"/>}{record.attachment && <SemanticIcon kind="attachment" label="첨부파일 있음"/>}</>}
            selection={{label:`${record.id} 일괄 선택`,checked:checked.includes(record.id),onCheckedChange:next=>setChecked(previous=>next ? [...previous,record.id] : previous.filter(id=>id !== record.id))}}
            actions={<Menu label={`${record.id} 작업`} triggerPresentation="icon" trigger={<MoreHorizontal size={16} aria-hidden="true"/>}
              items={[{id:"read",label:record.unread ? "읽음으로 표시" : "읽지 않음으로 표시"}]}
              onAction={()=>setRecords(previous=>previous.map(item=>item.id === record.id ? {...item,unread:!item.unread} : item))}/>}/>
        </li>)}
      </ul>
    </section>
    <section className={contentPresentation.group} aria-label="열린 업무 상세">
      <header className={contentPresentation.group}><p className={contentPresentation.caption}>{current.id}</p><h3 className={contentPresentation.heading}>{current.title}</h3></header>
      <p className={contentPresentation.body}>{current.summary}</p>
      <RecordFacts label="열린 업무 속성" presentation="list" items={[{id:"owner",label:"담당자",value:current.owner},{id:"state",label:"처리 상태",value:<StatusBadge tone={current.state === "완료" ? "success" : "neutral"}>{current.state}</StatusBadge>,actions:<Choice label="처리 상태 변경" presentation="popup" value={current.state} options={statusOptions} renderValue={()=>"변경"} onValueChange={state=>setRecords(previous=>previous.map(record=>record.id === current.id ? {...record,state} : record))}/>}]}/>
    </section>
  </div>;
}
