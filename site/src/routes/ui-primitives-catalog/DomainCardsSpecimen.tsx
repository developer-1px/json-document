import "@interactive-os/json-document-ui-primitives-react/chat-bubble.css";
import {useState} from "react";
import {Toolbar, PersonCard, EventCard, FileCard, RecordContext, RecordDetail, RecordSummary, RecordFacts, MessageThread, Choice, InquiryCard, TaskCard, ProductCard, ApprovalCard, ActivityCard, EvidenceCard, EditableText, Command, ValueInput, StatusBadge, PersonIdentity, DateDisplay, ContentGroup, SemanticIcon, StateIndicator, PriorityIndicator, ActivityFeed, Popover, floatingSurface, contentPresentation} from "@interactive-os/json-document-ui-primitives-react";

/** Only fixtures and composition. Card layout, controls and editing behavior stay with public owners. */
export function DomainCardsSpecimen() {
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [attending, setAttending] = useState(false);
  const [messagePresentation, setMessagePresentation] = useState<"correspondence"|"conversation">("correspondence");
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState("검토 후 다음 단계를 정합니다.");
  const [unread, setUnread] = useState(true);
  const [reply, setReply] = useState("결제 기록과 주문 생성 상태를 확인한 뒤 안내하겠습니다.");
  const [taskState, setTaskState] = useState("대기");
  const [stock, setStock] = useState(0);
  const [incoming, setIncoming] = useState(5);
  const [decision, setDecision] = useState("승인 대기");
  const [sourceOpen, setSourceOpen] = useState(false);
  return <ContentGroup relationship="region">
    <header className={contentPresentation.group}><h2 className={contentPresentation.heading}>같은 디자인 규칙, 다른 정보와 행동</h2><p className={contentPresentation.caption}>MOCK 데이터 · 인물·일정·파일·문의·업무·상품·승인·이력·결과를 비교합니다. 각 예제 아래에서 배치와 경계를 선택한 이유를 확인하세요.</p></header>
    <ContentGroup label="대상 식별" relationship="group"><header className={contentPresentation.group}><h3 className={contentPresentation.heading}>대상 식별</h3><p className={contentPresentation.caption}>누구인지, 언제인지, 어떤 문서인지 먼저 알아봅니다.</p></header>
    <div className="grid items-stretch [&>section]:min-w-0 [&>section]:border-b [&>section]:border-line-subtle [&>section]:p-group lg:grid-cols-3 lg:[&>section:not(:last-child)]:border-r">
      <section className={contentPresentation.group} aria-label="인물 카드 예제">
        <p className={contentPresentation.caption}>인물 · 누구인지 먼저, 연락은 별도 맥락</p>
        <PersonCard title="김민지" name="김민지" role="프로덕트 디자이너" organization="제품 경험 팀" contact={<RecordContext icon="email">minji@example.com</RecordContext>}><p className={contentPresentation.body}>업무 도구의 정보 구조와 상호작용을 설계합니다.</p></PersonCard>
        <p className={contentPresentation.caption}>이름·역할·소개는 읽는 콘텐츠입니다. 연락처는 별도 맥락으로 나누고, 이미 보이는 내용을 다시 여는 버튼은 두지 않습니다.</p>
      </section>
      <section className={contentPresentation.group} aria-label="일정 카드 예제">
        <p className={contentPresentation.caption}>일정 · 언제, 어디서, 누구와</p>
        <EventCard title="제품 경험 리뷰" schedule={<DateDisplay value="2026-10-16T14:00:00+09:00">10월 16일 · 14:00–14:30</DateDisplay>} location="회의실 A · 온라인 병행" participants="김민지, 이준호, 박서연" agenda="업무 인박스의 탐색 흐름과 결과 문서의 읽기 순서를 검토합니다." status={<StatusBadge tone={attending ? "success" : "neutral"}>{attending ? "참석 예정" : "응답 대기"}</StatusBadge>} actions={<Command onClick={()=>setAttending(value=>!value)}>{attending ? "참석 취소" : "참석으로 응답"}</Command>}/>
        <p className={contentPresentation.caption}>시간·제목·장소·참석자는 일정 콘텐츠입니다. 참석 응답은 이 일정에 적용하는 컨트롤이며 응답 상태와 구분합니다.</p>
      </section>
      <section className={contentPresentation.group} aria-label="파일 카드 예제">
        <p className={contentPresentation.caption}>파일 · 내용 미리보기와 출처 확인</p>
        <FileCard title="고객 인터뷰 정리.md" format="Markdown" size="24 KB" owner="박서연" updated={<DateDisplay value="2026-10-14">10월 14일</DateDisplay>} preview="참여자는 업무 선택 후 담당자와 마감부터 확인했습니다. 작성된 결과와 원래 요청을 구분할 수 있는 제목이 필요했습니다."/>
        <p className={contentPresentation.caption}>파일명·내용·작성 맥락을 읽습니다. 외곽선은 문서 경계, 내부 선은 출처 구분입니다. 실제 파일 열기가 연결되지 않은 보기 버튼은 두지 않습니다.</p>
      </section>
    </div></ContentGroup>
    <ContentGroup label="업무 처리" relationship="group"><header className={contentPresentation.group}><h3 className={contentPresentation.heading}>업무 처리</h3><p className={contentPresentation.caption}>문의와 답변, 담당 업무, 변경 전후와 결정을 구분합니다.</p></header>
    <div className="grid items-stretch [&>section]:min-w-0 [&>section]:border-b [&>section]:border-line-subtle [&>section]:p-group md:grid-cols-2 md:[&>section:first-child]:border-r">
      <section className={contentPresentation.group} aria-label="문의 카드 예제">
        <p className={contentPresentation.caption}>문의 · 내용 이해와 답변 작성</p>
        <InquiryCard title="결제 후 주문이 보이지 않습니다" identifier="SUP-101" unread={unread} status={<StatusBadge>접수</StatusBadge>} actions={<Command disabled={!unread} onClick={()=>setUnread(false)}>{unread ? "읽음으로 표시" : "읽음"}</Command>} customer={<PersonIdentity name="고객 A"/>} body={<ContentGroup relationship="related"><p>결제 완료 안내는 받았지만 주문 목록이 비어 있습니다. 같은 결제가 반복되지 않도록 확인 부탁드립니다.</p><Popover label="문의 첨부 파일" trigger={<RecordContext icon="attachment">첨부 2개</RecordContext>} open={attachmentsOpen} onOpenChange={setAttachmentsOpen} panelClassName={`${floatingSurface.panel} p-group`}><RecordFacts items={[{id:"payment",label:"결제 내역.pdf",value:"PDF · 24 KB"},{id:"order",label:"주문 목록.png",value:"PNG · 128 KB"}]}/></Popover></ContentGroup>}>
          <EditableText label="답변 초안" value={reply} onCommit={setReply}/>
        </InquiryCard>
        <p className={contentPresentation.caption}>읽지 않음 점과 접수 상태를 구분하고, 클립은 실제 첨부 목록으로 이어집니다. 답변 초안은 받은 본문과 분리합니다.</p>
      </section>
      <section className={contentPresentation.group} aria-label="업무 카드 예제">
        <p className={contentPresentation.caption}>업무 · 담당자와 기한으로 다음 행동 판단</p>
        <TaskCard title="CSV 내보내기의 한글 인코딩 확인" identifier="TEAM-101" flagged completed={taskState === "완료"} overdue={taskState !== "완료"} onCompletedChange={complete=>setTaskState(complete?"완료":"대기")} priority={<PriorityIndicator label="높음" level="high"/>} status={<StatusBadge tone={taskState === "완료" ? "success" : taskState === "진행" ? "active" : "neutral"}>{taskState}</StatusBadge>} summary="Windows Excel에서 고객 이름이 깨지는 조건을 재현하고 내보내기 설정을 확인합니다." assignee="김민지" due={<DateDisplay value="2026-10-13">10월 13일</DateDisplay>} actions={taskState === "대기" ? <Command kind="primary" onClick={()=>setTaskState("진행")}>작업 시작</Command> : undefined}/>
        <p className={contentPresentation.caption}>체크는 완료 조작, 깃발은 중요 표시, 우선순위는 별도 속성입니다. 날짜·담당자와 기한 초과를 함께 읽습니다.</p>
      </section>
      <section className={`${contentPresentation.group} md:col-span-2`} aria-label="승인 카드 예제">
        <p className={contentPresentation.caption}>승인 요청 · 변경 내용과 결정</p>
        <ApprovalCard title="고객 안내 문구 변경" identifier="REQ-204" changed comparison={[{id:"message",label:"안내 문구",before:"주문을 찾을 수 없습니다.",after:"주문 생성 상태를 확인 중입니다. 문의하면 결제 기록과 함께 확인해 드립니다."}]} status={<StatusBadge icon={<SemanticIcon kind={decision === "승인됨" ? "complete" : "change"}/>}>{decision}</StatusBadge>} change="결제 후 주문 생성이 지연될 때 보여주는 문구에 확인 방법과 문의 경로를 추가하려고 합니다." requester="박서연" requestedAt={<DateDisplay value="2026-10-14T09:30:00+09:00">10월 14일 09:30</DateDisplay>} actions={<><Command kind="primary" disabled={decision !== "승인 대기"} onClick={()=>setDecision("승인됨")}>승인</Command><Command disabled={decision !== "승인 대기"} onClick={()=>setDecision("반려됨")}>반려</Command></>}/>
        <p className={contentPresentation.caption}>변경 전/후를 비교한 다음 정의된 MOCK 승인·반려를 결정합니다.</p>
      </section>
    </div></ContentGroup>
    <ContentGroup label="수량·기록·근거" relationship="group"><header className={contentPresentation.group}><h3 className={contentPresentation.heading}>수량·기록·근거</h3><p className={contentPresentation.caption}>수치로 비교하고, 발생한 기록과 실제 출처를 읽습니다.</p></header>
    <div className="grid items-stretch [&>section]:min-w-0 [&>section]:border-b [&>section]:border-line-subtle [&>section]:p-group md:grid-cols-2 md:[&>section:first-child]:border-r">
      <section className={contentPresentation.group} aria-label="상품 카드 예제">
        <p className={contentPresentation.caption}>상품 · 수량과 가격, 입고 맥락</p>
        <ProductCard title="무선 키보드" identifier="KB-001" category="주변기기" quantity={{value:stock, unit:"개"}} price={{value:59000, currency:"KRW"}} note={stock === 0 ? "다음 입고일은 미정입니다." : "MOCK 입고 수량을 재고에 반영했습니다."} actions={<Toolbar label="입고 기록"><span className={contentPresentation.caption}>입고 수량</span><ValueInput label="입고 수량" value={incoming} min={1} max={100} step={1} presentation="stepped" onValueChange={setIncoming}/><Command onClick={()=>setStock(value=>value+incoming)}>입고 기록</Command></Toolbar>}/>
        <p className={contentPresentation.caption}>수량/가격 → 단위 있는 값 · 입고 메모 → 본문 · 여러 상품 비교 → 표</p>
      </section>
      <section className={contentPresentation.group} aria-label="활동 카드 예제">
        <p className={contentPresentation.caption}>활동 · 이미 발생한 변화 읽기</p>
        <ActivityFeed label="업무 변경 이력" presentation="timeline" entries={[{id:"assigned",actor:"이준호",action:"담당자를 변경했습니다",dateTime:"2026-10-14T10:24:00+09:00",timeLabel:"10:24",icon:<SemanticIcon kind="person"/>,detail:"TEAM-101 · 김민지에게 담당 업무를 전달했습니다."},{id:"started",actor:"김민지",action:"인코딩 확인을 시작했습니다",dateTime:"2026-10-14T10:40:00+09:00",timeLabel:"10:40",icon:<SemanticIcon kind="task"/>,detail:"Windows Excel에서 고객 이름이 깨지는 조건을 재현합니다."}]}/>
        <p className={contentPresentation.caption}>행위자·행동·시각 → 발생 사실 · 관련 대상 → 연결 맥락 · 연속 이력 → ActivityFeed</p>
      </section>
      <section className={`${contentPresentation.group} md:col-span-2`} aria-label="결과 카드 예제">
        <p className={contentPresentation.caption}>결과 · 본문과 근거, 후속 행동</p>
        <EvidenceCard title="주문 누락 문의의 확인 방향" body="중복 결제를 요청하기 전에 결제 기록과 주문 생성 상태를 확인합니다. 확인 결과에 따라 고객에게 다음 단계를 안내합니다." source="고객 문의 · SUP-101" actions={<Popover label="문의 근거" trigger="근거 보기" open={sourceOpen} onOpenChange={setSourceOpen} panelClassName={`${floatingSurface.panel} p-group`}><p className={contentPresentation.body}>결제 완료 안내는 받았지만 주문 목록이 비어 있습니다. 같은 결제가 반복되지 않도록 확인 부탁드립니다.</p></Popover>}/>
        <p className={contentPresentation.caption}>결과 → 읽기 본문 · 출처 → 실제 근거 · 확인 → 기존 Popover</p>
      </section>
    </div></ContentGroup>
    <ContentGroup label="도메인 중립적인 구성" relationship="group">
      <h3 className={contentPresentation.heading}>정본 구조와 슬롯</h3>
      <RecordDetail header={<RecordSummary headingLevel={3} title="선택한 항목" summary="제목·요약·상태·맥락을 같은 위치에 배치합니다." status={<StatusBadge>검토</StatusBadge>}/>} supplementary={<RecordFacts items={[{id:"date",label:"확인일",value:<DateDisplay value="2026-10-15">10월 15일</DateDisplay>},{id:"owner",label:"담당자",value:"김민지"}]}/>} actions={<Command onClick={()=>setEditing(value=>!value)}>{editing ? "읽기로 전환" : "편집으로 전환"}</Command>}>
        {editing ? <EditableText label="항목 메모" value={note} onCommit={setNote}/> : <p className={contentPresentation.body}>{note}</p>}
      </RecordDetail>
      <Choice label="메시지 관계" presentation="inline" value={messagePresentation} options={[{id:"correspondence",label:"본문과 답장"},{id:"conversation",label:"대화 기록"}]} onValueChange={value=>setMessagePresentation(value === "conversation" ? "conversation" : "correspondence")}/>
      <MessageThread label="같은 메시지의 두 표현" presentation={messagePresentation} messages={[{id:"received",sender:"고객 A",body:"주문 생성 상태를 확인해 주세요.",direction:"incoming"},{id:"sent",sender:"지원팀",body:"결제 기록과 함께 확인하겠습니다.",direction:"outgoing"}]}/>
    </ContentGroup>
  </ContentGroup>;
}
