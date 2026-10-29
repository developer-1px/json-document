import type { JSONValue } from "@interactive-os/json-document";
import type { UIBindingTarget } from "./ui-binding.js";
import {uiDomainCardCatalog, uiDomainCardFieldRoles} from "./ui-domain-card.js";
export const baseUIComponentCatalog = [
  { id: "heading", bindingTargets: ["text"], label: "제목", width: 440, height: 64, text: "새로운 아이디어", detail: "", items: [], description: "Page or section heading" },
  { id: "text", bindingTargets: ["text"], label: "본문", width: 440, height: 80, text: "전하고 싶은 이야기를 적어보세요.", detail: "", items: [], description: "Paragraph or supporting copy" },
  { id: "button", bindingTargets: ["text"], label: "버튼", width: 160, height: 48, text: "시작하기", detail: "", items: [], description: "Primary or secondary call to action" },
  { id: "page-link", bindingTargets: ["text"], label: "페이지 이동", width: 180, height: 48, text: "다음 페이지", detail: "", items: [], description: "Navigation button; targetPageId identifies its destination page" },
  { id: "input", bindingTargets: ["text", "value"], label: "입력", width: 320, height: 84, text: "이메일", detail: "you@example.com", items: [], description: "Labelled single-line input; detail is placeholder" },
  { id: "textarea", bindingTargets: ["text", "value"], label: "긴 입력", width: 320, height: 152, text: "메시지", detail: "내용을 입력하세요", items: [], description: "Labelled multiline input; detail is placeholder" },
  { id: "checkbox", bindingTargets: ["text", "value"], label: "체크박스", width: 300, height: 44, text: "소식을 받아볼게요", detail: "", items: [], description: "Boolean choice with a label" },
  { id: "select", bindingTargets: ["text", "items", "value"], label: "선택 목록", width: 280, height: 84, text: "카테고리", detail: "", items: ["전체", "디자인", "개발"], description: "Labelled selection among items" },
  { id: "tabs", bindingTargets: ["items"], label: "탭", width: 360, height: 48, text: "메뉴", detail: "", items: ["소개", "프로젝트", "연락처"], description: "Navigation tabs from items" },
  { id: "card", bindingTargets: ["text", "detail"], label: "카드", width: 300, height: 180, text: "작은 시작, 큰 가능성", detail: "아이디어를 함께 발전시켜보세요.", items: [], description: "Independent content card with heading and description" },
  { id: "metric", bindingTargets: ["text", "detail"], label: "숫자", width: 220, height: 132, text: "진행 중인 프로젝트", detail: "12", items: [], description: "Metric label and large value in detail" },
  { id: "list", bindingTargets: ["text", "items"], label: "목록", width: 320, height: 200, text: "할 일", detail: "", items: ["아이디어 정리", "첫 화면 만들기", "함께 확인하기"], description: "Titled list of items" },
  { id: "divider", bindingTargets: [], label: "구분선", width: 440, height: 24, text: "구분선", detail: "", items: [], description: "Horizontal section boundary" },
] as const;


export type UIComponentPropertyRule = { readonly type: "string" | "number" | "boolean" | "strings" | "object" | "files"; readonly enum?: readonly string[] };
const bool = {type: "boolean"} as const;
const string = {type: "string"} as const;
const strings = {type: "strings"} as const;
const number = {type: "number"} as const;
const enumeration = (...values: string[]): UIComponentPropertyRule => ({type: "string", enum: values});
export const recordWorkspaceSlotProperties = ["headerId", "listHeaderId", "listId", "detailHeaderId", "detailId", "propertiesId"] as const;
const propertySchemas: Readonly<Record<string, Readonly<Record<string, UIComponentPropertyRule>>>> = {
  "page-header": {level: number, titleRole: enumeration("section", "primary")}, "sidebar-navigation": {pageIds: strings, currentPageId: string},
  avatar: {src: string}, "person-identity": {src: string},
  "priority-indicator": {level: enumeration("low", "normal", "high")},
  "date-display": {dateTime: string, overdue: bool},
  "date-range-display": {start:string,end:string},
  "record-facts": {labels:strings,presentation:enumeration("grid","list")},
  "tag-picker": {options:{type:"object"},selectedIds:strings,disabled:bool},
  "number-field": {min:number,max:number,precision:number,unit:string,required:bool,disabled:bool},
  "comment-composer": {targetId:string,actor:string,submitLabel:string,disabled:bool},
  "quantity-display": {unit: string, locale: string}, "money-display": {currency: string, locale: string},
  "empty-state": {}, "inline-alert": {tone: enumeration("info", "error", "success")},
  stepper: {currentIndex: number}, "activity-feed": {entries: {type: "object"}, presentation: enumeration("list", "timeline")},
  "people-picker": {disabled: bool, people:{type:"object"}}, "filter-bar": {targetTableId: string, fieldId: string, resultCount: number},
  "status-badge": {tone: enumeration("neutral", "active", "success", "attention")},
  "result-panel": {emptyMessage: string, actionCount: number},
  "property-editor": {labels: strings},
  "editable-text": {disabled: bool},
  group: {relationship: enumeration("related", "group", "region")},
  card: {emptyMessage: string, actionCount: number},
  "record-card": {messagePresentation: enumeration("correspondence", "conversation"), presentation: enumeration(...uiDomainCardCatalog.map(entry => entry.id)), ...Object.fromEntries(uiDomainCardFieldRoles.map(role => [`${role}FieldId`, string])), actionCount: number, unit: string, currency: string},
  "file-drop": {files: {type: "files"}},
  table: {editable: bool, readOnly: bool},
  "record-list": {itemKind: enumeration("message", "task", "product", "change", "activity", "result"), unreadFieldId: string, completedFieldId: string, overdueFieldId: string, priorityFieldId: string, presentation: enumeration("fields", "feed"), titleFieldId: string, summaryFieldId: string, identifierFieldId: string, statusFieldId: string, assigneeFieldId: string, updatedAtFieldId: string},
  button: {disabled: bool}, input: {disabled: bool, required: bool, description: string}, textarea: {disabled: bool, required: bool, description: string}, checkbox: {disabled: bool}, select: {targetTableId: string, fieldId: string, disabled: bool, presentation: enumeration("popup", "inline")},
  search: {disabled: bool, targetTableId: string, fieldId: string}, "value-input": {presentation: enumeration("continuous", "stepped"), disabled: bool, min: number, max: number, step: number},
  toggle: {disabled: bool, presentation: enumeration("button", "chip")}, disclosure: {expanded: bool, disabled: bool},
  "selectable-item": {selected: bool, disabled: bool}, tabs: {pageIds: strings, disabled: bool}, "page-link": {disabled: bool}, menu: {actionIds: strings, targetPageIds: strings},
  "chat-bubble": {direction: enumeration("incoming", "outgoing")}, "resize-handle": {orientation: enumeration("horizontal", "vertical")},
  "record-workspace": {tableId: string, ...Object.fromEntries(recordWorkspaceSlotProperties.map(key => [key, string]))},
  "product-shell": {toolbarIds: strings, inspectorIds: strings, toolbarPresentation: enumeration("attached", "floating"), fill: bool},
  "product-inspector": {open: bool, presentation: enumeration("attached", "floating"), footerCount: number}, "toolbar-region": {placement: enumeration("start", "center", "end")},
  "contextual-controls": {selected: bool, editing: bool}, popover: {open: bool}, dialog: {open: bool, presentation: enumeration("modal", "sheet")},
  "date-picker": {disabled: bool, visibleDate: string},
  "date-range-picker": {disabled: bool, visibleDate: string, start: string, end: string}, "range-calendar": {visibleDate: string, start: string, end: string, grain: enumeration("week", "month", "year")}, "calendar-grid": {visibleDate: string, grain: enumeration("week", "month", "year")},
  "date-grid": {visibleDate: string, grain: enumeration("week", "month", "year")}, "calendar-month": {visibleDate: string, calendar: {type: "object"}}, "calendar-time": {visibleDate: string, days: number, calendar: {type: "object"}}, "calendar-event-inspector": {calendar: {type: "object"}},
  "shimmer-text": {tone: enumeration("mono", "spectrum"), announce: bool}, skeleton: {shape: enumeration("line", "block", "avatar")}, "stagger-lines": {lines: number}, "wave-dots": {frame: enumeration("none", "bubble"), announce: bool},
};
const dateFields = ["date-field", "time-field", "datetime-field", "month-field", "week-field"];
const animationSchema = {announce: bool};
const contentKinds = ["tag", "tag-group", "record-facts", "date-range-display", "page-header", "sidebar-navigation", "avatar", "person-identity", "priority-indicator", "date-display", "quantity-display", "money-display", "empty-state", "inline-alert", "stepper", "activity-feed", "status-badge", "result-panel", "property-editor", "title", "caption", "group", "table", "detail-list", "record-list", "record-card"] as const;
const compositionKinds = ["record-workspace", "product-shell", "product-canvas", "product-inspector", "toolbar", "toolbar-group", "toolbar-layout", "toolbar-region", "toolbar-separator", "toolbar-spacer", "contextual-controls", "popover", "dialog"] as const;
const controlKinds = ["number-field", "tag-picker", "comment-composer", "people-picker", "filter-bar", "editable-text", "search", "value-input", "toggle", "disclosure", "selectable-item", "menu", "chat-bubble", "chat-activity", "file-drop", "control-handle", "drag-handle", "resize-handle", "grid-cell"] as const;
const calendarKinds = ["date-field", "time-field", "datetime-field", "month-field", "week-field", "date-picker", "date-range-picker", "range-calendar", "calendar-grid", "date-grid", "calendar-month", "calendar-time", "calendar-event-inspector"] as const;
const feedbackKinds = ["aurora-mass", "blob-mass", "border-beam", "cloud-mass", "comet-arc", "dual-rings", "equalizer-bars", "fade-spokes", "gradient-sweep", "helix-dots", "helix-rings", "hue-outline", "infinity-stroke", "loading-bar", "mass-orb", "morse-code", "morph-square", "orbit-dots", "particle-burst", "progress-ring", "pulsing-dot", "pulsing-orb", "radar-sweep", "ring-mass", "shimmer", "shimmer-text", "skeleton", "stagger-lines", "streaming-caret", "wave-dots", "wave-grid"] as const;

const defaults: Readonly<Record<string, Record<string, JSONValue>>> = {
  "record-card": {presentation: "inquiry"},
  "toolbar-region": {placement: "start"}, "chat-bubble": {direction: "incoming"}, "resize-handle": {orientation: "horizontal"},
  "value-input": {step: 1}, "date-picker": {visibleDate: "2026-10-01"}, "range-calendar": {visibleDate: "2026-10-01"},
  "calendar-grid": {visibleDate: "2026-10-01", grain: "month"}, "date-grid": {visibleDate: "2026-10-01"},
  "calendar-month": {visibleDate: "2026-10-01"}, "calendar-time": {visibleDate: "2026-10-01", days: 7},
};
function schemaFor(id: string): Readonly<Record<string, UIComponentPropertyRule>> {
  if (dateFields.includes(id)) return {disabled: bool};
  return propertySchemas[id] ?? (feedbackKinds.some(kind => kind === id) ? animationSchema : {});
}
const labels: Readonly<Record<string, string>> = {
  "number-field":"숫자 입력", "tag":"분류 표시", "tag-group":"여러 분류 표시", "tag-picker":"여러 분류 선택", "record-facts":"속성 목록", "date-range-display":"기간 표시", "comment-composer":"기록 작성",
  "page-header": "페이지 헤더", "sidebar-navigation": "사이드 내비게이션", avatar: "아바타", "person-identity": "담당자 표시", "priority-indicator": "우선순위 표시", "date-display": "날짜 표시", "quantity-display": "수량 표시", "money-display": "금액 표시", "empty-state": "빈 상태", "inline-alert": "알림", stepper: "처리 단계", "activity-feed": "활동 기록", "people-picker": "담당자 선택", "filter-bar": "적용 필터",
  "status-badge": "상태 표시", "result-panel": "결과 패널", "property-editor": "속성 편집",
  title: "페이지 제목", caption: "보조 설명", group: "콘텐츠 그룹", table: "데이터 표", "detail-list": "상세 필드 목록", "record-list": "레코드 목록",
  "editable-text": "읽기·편집 본문", "record-workspace": "목록·상세 작업 공간", "product-shell": "제품 화면", "product-canvas": "작업 영역", "product-inspector": "상세 패널",
  "record-card": "도메인 카드",
  toolbar: "도구 모음", "toolbar-group": "도구 그룹", "toolbar-layout": "도구 배치", "toolbar-region": "도구 영역", "toolbar-separator": "도구 구분선", "toolbar-spacer": "도구 여백",
  "contextual-controls": "선택 맥락 도구", popover: "팝오버", dialog: "대화상자", search: "검색", "value-input": "수치 입력", toggle: "켜짐 선택", disclosure: "펼침 버튼", "selectable-item": "선택 항목", menu: "메뉴", "chat-bubble": "대화 메시지", "chat-activity": "대화 진행", "file-drop": "파일 받기", "control-handle": "조작 핸들", "drag-handle": "이동 핸들", "resize-handle": "크기 핸들", "grid-cell": "그리드 셀",
  "date-field": "날짜 입력", "time-field": "시각 입력", "datetime-field": "날짜와 시각 입력", "month-field": "월 입력", "week-field": "주 입력", "date-picker": "날짜 선택", "date-range-picker": "기간 선택", "range-calendar": "기간 달력", "calendar-grid": "날짜 달력", "date-grid": "날짜 격자", "calendar-month": "월 일정", "calendar-time": "시간 일정", "calendar-event-inspector": "일정 상세",
};
function targetsFor(id: string, category: string): readonly UIBindingTarget[] {
  if (id === "tag-group") return ["text","items"];
  if (id === "number-field") return ["text","value"];
  if (["quantity-display", "money-display"].includes(id)) return ["text", "detail"];
  if (["result-panel", "page-header", "empty-state", "inline-alert"].includes(id)) return ["text", "detail"];
  if (["people-picker", "filter-bar"].includes(id)) return ["text", "items", "value"];
  if (["stepper", "sidebar-navigation"].includes(id)) return ["text", "items"];
  if (category === "feedback") return ["text"];
  if (["table", "detail-list", "record-list", "record-card"].includes(id)) return ["text"];
  if (["editable-text", "toggle", "selectable-item", "search", "value-input"].includes(id) || category === "calendar") return ["text", "value"];
  if (id === "menu") return ["text", "items"];
  if (id === "chat-bubble") return ["text", "detail"];
  if (["toolbar-separator", "toolbar-spacer"].includes(id)) return [];
  return ["text"];
}
function mappingFor(id: string, category: string): string {
  if (id === "number-field") return "정확한 숫자 직접 입력. value는 숫자이고 빈 값은 미정이다. min/max/precision/unit은 실제 도메인 정책으로 설정한다. 금액은 unit에 통화 코드를 명시하고 precision을 주입한다. 입력 중 잘못된 문자열을 숫자·0으로 강제 변환하지 않는다. Database 숫자 바인딩은 필수 값이므로 비우면 검증 오류를 표시하고 이전 저장 값을 보존한다. 상대적 증감·슬라이더는 value-input이다.";
  if (id === "tag") return "한 분류의 읽기 표현. 상태·심각도는 status-badge, 분류 수정은 select다. 조작 가능한 버튼으로 위장하지 않는다.";
  if (id === "tag-group") return "items에 실제 분류명을 연결해 여러 분류를 읽는다. 수정은 tag-picker의 별도 체크 동작이다.";
  if (id === "tag-picker") return "복수 분류의 포함·제외. props.options.items는 {id,label,disabled?} 배열이고 selectedIds는 선택 ID 배열이다. 이름으로 ID를 대체하지 않는다. 현재 문서 옵션을 저장하며 Database 다중 관계 바인딩은 지원하지 않는다.";
  if (id === "record-facts") return "한 대상의 라벨·값 목록 정본. props.labels와 childIds를 같은 순서로 연결한다. presentation=list는 속성 행, grid는 요약 속성이다. 읽기 값 또는 기존 입력을 자식으로 주입하며 목록은 저장·검증을 소유하지 않는다. property-editor는 호환 이름이다.";
  if (id === "date-range-display") return "하나의 기간 읽기. props.start/end는 ISO 날짜이며 text는 영역 접근성 이름이다. 시작·종료를 독립된 날짜처럼 흩뜨리지 않는다. 수정은 date-range-picker다.";
  if (id === "comment-composer") return "새 기록 작성. props.targetId는 같은 문서의 activity-feed ID, actor는 실제 작성자 표시명, submitLabel은 제출 문구다. 제출 시 새 ID·실제 시각으로 대상 entries.items 끝에 추가하고 기존 기록을 보존한다. 편집은 제출 전 초안에만 적용한다. 필수 대상·작성자를 연결하지 않으면 제출할 수 없다.";
  if (id === "group") return "가장 가까운 공통 부모가 관계의 간격을 소유한다. props.relationship=related(라벨·값·같은 작업 8px)/group(작업 묶음 16px)/region(독립 영역 32px). 기본 group. 같은 대상을 이어 읽으면 간격만, 독립 대상은 card, 한 작업의 서로 다른 단계는 기존 divider를 그룹 사이에 둔다. 카드·패널 안에 같은 구획을 위한 박스/패딩을 더하지 않는다.";
  if (id === "record-card") return "선택한 하나의 레코드를 실제 fieldId 역할로 표현한다. collection {tableId,fieldIds}, props.presentation=person/event/file/inquiry/task/product/approval/activity/result와 해당 역할의 titleFieldId/bodyFieldId 등을 함께 제출한다. 도메인 카드 recipe의 필수·허용 역할을 따른다. childIds는 기존 편집/후속 콘텐츠와 끝의 actionCount 행동이다. 카드 자체 제목이 대상 이름이므로 같은 heading을 추가하지 않는다. product 수량은 number+unit, 가격은 number+currency. 여러 항목 비교는 table, 반복 탐색은 record-list feed로 유지한다.";
  if (id === "quantity-display") return "읽기 수량. text는 필드명, detail에 실제 숫자를 바인딩하고 unit은 도메인 단위를 명시한다. 0은 값이며 빈 값은 미정이다. 정확한 입력은 number-field, 상대적 증감은 value-input을 사용한다.";
  if (id === "money-display") return "읽기 금액. text는 필드명, detail은 실제 금액, currency는 실제 ISO 통화 코드다. 환전하거나 통화를 추측하지 않는다. 금액 변경은 number-field에 실제 precision과 unit 통화 코드를 지정한다.";
  if (id === "people-picker") return "인물 후보는 props.people.items의 {id,name,description?,src?}로 연결하고 value에는 실제 인물 ID를 바인딩한다. items 이름 목록은 이전 문서 호환용일 뿐 신규 구성에 사용하지 않는다. 기존 Popover와 useListbox로 검색·키보드 선택한다.";
  if (id === "empty-state") return "검색 결과 없음·선택 없음·첫 사용의 이유와 다음 행동. text는 제목, detail은 이유, childIds는 실제 복구 행동이다.";
  if (id === "activity-feed") return "실제 actor/action/dateTime/timeLabel/detail 기록을 props.entries.items로 전달한다. 기록을 임의 생성하지 않는다.";
  if (id === "stepper") return "실제 순서가 있는 workflow 단계. items는 단계명, currentIndex는 현재 위치다. 페이지 이동 버튼으로 오용하지 않는다.";
  if (id === "sidebar-navigation") return "items와 pageIds를 같은 순서로 연결하며 현재 페이지를 표시한다. 명령 메뉴와 달리 페이지 이동이다.";
  if (id === "status-badge") return "읽기용 상태 표시. neutral는 일반 상태, active는 현재 진행, success는 완료, attention은 주의·차단·심각도다. 상태와 심각도를 동일 필드로 합치지 않는다. 상태 변경은 select를 사용한다.";
  if (id === "property-editor") return "record-facts의 호환 ID. 신규 구성은 record-facts를 사용한다. label-value 속성 목록. props.labels는 childIds와 같은 순서의 필드명이고 각 child는 값 또는 기존 입력이다. 입력의 접근성 라벨도 유지한다.";
  if (id === "result-panel") return "ContentCard의 호환 조합 ID. 신규 구성은 card에 결과 본문과 후속 행동을 조합한다. 독립된 실행 결과. text는 제목, detail은 결과 본문, childIds는 기존 후속 행동. 결과가 없으면 emptyMessage로 다음 행동을 안내한다.";
  if (id === "product-inspector") return "본문 옆 속성/보조 작업 패널. presentation attached는 붙은 패널, floating은 떠 있는 아일랜드. title은 text, 본문은 childIds이며 open으로 표시한다. 위치·크기는 Host, 시각 규칙은 정본이 소유한다.";
  if (id === "record-workspace") return "목록과 상세를 계속 오가며 처리하는 제품 작업 공간. props.headerId/listHeaderId/listId/detailHeaderId/detailId/propertiesId로 영역별 컴포넌트를 직접 참조한다. 쓰지 않는 영역은 생략한다. 신규 구성에 순서 기반 childIds를 쓰지 않는다. 주 본문·답변 작성은 detailId, 보조 속성은 propertiesId에 놓는다. props.tableId는 선택 대상 테이블이며 검색·필터는 listHeader, 본문은 detail, 보조 속성은 properties에 놓는다.";
  if (id === "editable-text") return "text가 제목과 편집 접근성 이름을 직접 제공한다. 같은 제목의 heading을 추가하지 않고 text를 비우지 않는다. 본문은 읽기로 시작하고 명시적 저장·취소로 편집한다. value를 현재 선택 레코드의 text 필드에 바인딩한다. 입력 즉시 저장하는 textarea와 구분한다.";
  if (id === "toolbar") return "관련 조작을 childIds로 가로로 묶는다. 정본 Toolbar CSS는 flex row, 중앙 정렬, 공통 간격과 좁은 폭의 줄바꿈을 제공한다. 별도 direction/columns/CSS props가 필요하지 않다.";
  if (id === "toolbar-group") return "한 과업의 관련 조작을 childIds 순서대로 가로로 인접하게 묶는다. 정본 ToolbarGroup CSS는 flex row, 중앙 정렬과 공통 간격을 제공한다. 줄바꿈이 필요하면 toolbar 안에서 그룹 경계를 유지한다.";
  if (id === "table") return "text가 표 영역 제목을 직접 제공한다. 같은 heading을 추가하거나 text를 비우지 않는다. 동일 필드를 가진 여러 레코드 비교. collection.fieldIds 순서로 열을 구성하고 상품명·재고·가격 같은 한 레코드의 관계를 보존한다.";
  if (id === "record-list") return "탐색·처리 목록은 presentation=feed, 실제 대상 종류의 itemKind와 실제 titleFieldId/summaryFieldId/statusFieldId/assigneeFieldId 등을 명시해 제목·요약·상태 위계를 사용한다. 모든 필드를 라벨과 값으로 비교해야 할 때만 fields를 쓴다. unread/completed/overdueFieldId는 실제 checkbox 필드의 인디케이터다. priorityFieldId는 우선순위이고 상태와 구분한다. 없는 역할은 채우지 않는다. text가 목록 제목을 직접 제공하므로 비우거나 같은 heading/listHeader를 추가하지 않는다. 반복되는 레코드의 이름·상태·보조 정보를 한 항목에 묶는다. 필드별 독립 목록으로 관계를 분리하지 않는다.";
  if (id === "detail-list") return "text가 속성 영역 제목을 직접 제공한다. 별도 동일 heading을 추가하지 않는다. 하나의 레코드 속성을 필드명과 값으로 읽는다. collection 연결로 관련 속성을 함께 표시한다.";
  if (id.endsWith("-field")) return "날짜의 업무상 의미(마감·예약·조회 범위)에 맞는 단위로 직접 입력한다. 단순 날짜 표시를 입력 기능으로 바꾸지 않는다.";
  if (id.includes("range")) return "시작과 끝이 있는 조회·예약 기간을 선택한다. props.start/end로 기간을 보존한다.";
  if (id.startsWith("calendar-")) return "실제 일정 데이터를 월·시간·상세 중 해당 과업의 정본 뷰로 표현한다. props.calendar는 CalendarDocument 계약을 따른다.";
  if (category === "feedback") return "실제 처리 중·스트리밍·로딩 상태를 전달한다. 수치 진행률을 지원하지 않으며 장식이나 가짜 KPI로 사용하지 않는다.";
  if (category === "composition") return "자식 요소 childIds와 정본 공개 slot으로 화면·도구·오버레이를 조합한다. 사용자에게 의미 없는 빈 컨테이너를 만들지 않는다.";
  if (id === "search") return "targetTableId와 fieldId의 레코드를 조회한다. 결과 대상과 실제 검색 동작을 연결한다.";
  if (id === "value-input") return "최소·최대·간격이 정의된 변경 가능한 수량·수치를 입력한다. 실제 도메인 범위로 min/max/step을 설정한다. 읽기 전용 수량은 quantity-display, 금액은 money-display, 식별자는 caption/detail-list로 읽는다.";
  return `${labels[id] ?? id}의 실제 역할과 데이터 상태를 표현한다. 조작은 실제 상태·동작 계약에 연결한다.`;
}
function entry<const T extends string>(id: T, category: string) {
  const owner = id === "table" ? "json-document-database" : ["detail-list", "record-list", "record-card"].includes(id) ? "json-document-canvas" : category === "calendar" ? "json-document-calendar" : category === "feedback" ? "json-document-animation-react" : "json-document-ui-primitives-react";
  return {id, category, aliasOf:id==="property-editor"?"record-facts":id==="result-panel"?"card":undefined, label: labels[id] ?? `${id} 애니메이션`, width: category === "calendar" ? 440 : 320, height: category === "calendar" ? 320 : category === "feedback" ? 80 : 120,
    text: labels[id] ?? "처리 중", detail: "", items: [] as readonly string[], bindingTargets: targetsFor(id, category),
    description: `${id}: canonical ${category} capability. Use childIds for composed content; bind actual data and wire supported actions, never invent inert controls.`,
    source: `packages/${owner}/src/index.ts`, mapping: mappingFor(id, category),
    defaultProps: defaults[id] ?? {}, propertySchema: schemaFor(id)};
}
export const uiComponentCatalog = [
  ...baseUIComponentCatalog.map(item => ({...item, category: ["button", "page-link", "input", "textarea", "checkbox", "select", "tabs"].includes(item.id) ? "control" : "content", source: "packages/json-document-ui-primitives-react/src/index.ts", mapping: item.id === "card" ? "독립된 콘텐츠/과업 단위. text는 제목, detail은 설명, childIds는 본문과 행동이다. props.actionCount는 끝의 행동 개수이며 나머지는 본문이다. 이미 부모가 같은 단위를 구획하면 group을 쓴다. 내용마다 카드로 감싸거나 카드 안에 같은 제목을 반복하지 않는다. 선택/이동은 별도 기존 컨트롤을 연결한다." : item.description, defaultProps: {} as Record<string, JSONValue>, propertySchema: schemaFor(item.id)})),
  ...contentKinds.map(id => entry(id, "content")), ...compositionKinds.map(id => entry(id, "composition")),
  ...controlKinds.map(id => entry(id, "control")), ...calendarKinds.map(id => entry(id, "calendar")), ...feedbackKinds.map(id => entry(id, "feedback")),
] as const;
/** Existing serialized aliases remain valid, but are not offered as additional capabilities. */
export const uiComponentAuthoringCatalog=uiComponentCatalog.filter(entry=>!("aliasOf" in entry && entry.aliasOf));
export const uiComponentCompositionRecipes = [
  {id:"execution-result",source:"packages/json-document-ui-primitives-react/src/content-card.tsx",components:["card","text","button"],description:"Independent execution result = ContentCard with real result body and optional follow-up actions. ResultPanel/result-panel is a compatibility alias, not another surface. Do not make a read result an input by default."},
  {id:"group-boundary-choice",source:"packages/json-document-ui-primitives-react/src/content-group.tsx",components:["group","divider","card"],description:"For each tree group state boundary and why: spacing for continuous related content (related/group/region existing tokens); card only for independent objects/tasks; divider between peer phases inside one work area; timeline line only for temporal sequence. Do not add a surface to every group or nest duplicate inset/borders. Use divider as an existing child between groups, not between every field."},
  ...uiDomainCardCatalog.map(entry => ({id: `domain-card-${entry.id}`, source: "packages/json-document-ui-primitives-react/src/domain-cards.tsx", components: ["record-card"], presentation: entry.id, requiredRoles: entry.required, fieldRoles: entry.roles, description: `${entry.purpose}. ${entry.reason} 모든 role은 props.<role>FieldId로 실제 컬렉션 필드에 연결한다. 구조는 RecordSummary/RecordDetail/RecordFacts/MessageThread/ChangeComparison의 정본 조합이다. inquiry의 messagePresentation은 correspondence(본문과 답장)/conversation(대화 기록)이며 외형 취향이 아닌 데이터 관계로 선택한다.`})),
  {id: "content-surface-choice", source: "packages/json-document-ui-primitives-react/src/content-card.tsx", components: ["group", "card", "record-list", "product-inspector"], description: "Choose a surface by the group's purpose. group = a continuous reading/writing sequence already contained by its parent, no added box. card = independently understandable content/task with its own optional title/body/actions; detail + childIds body, trailing actionCount children as actions. record-list presentation=feed = repeated selectable objects with title/summary/status roles, not a card per field. product-inspector = persistent secondary context/work, attached or floating only when it really overlays. Explain the selected boundary, not decoration. Never stack surfaces or duplicate titles for the same group."},
  {id: "record-workspace-slots", source: "packages/json-document-ui-primitives-react/src/record-workspace.tsx", components: ["record-workspace"], description: "Use named props headerId/listHeaderId/listId/detailHeaderId/detailId/propertiesId. Omit unused slots. listId references a record-list/table; detailId references the main content/writing group, propertiesId only secondary metadata. Do not also provide childIds. Legacy childIds has six positional slots and is not recommended for generation."},
  {id: "related-controls", source: "packages/json-document-ui-primitives-react/src/design-system.css", components: ["toolbar", "toolbar-group", "select", "date-picker"], description: "Toolbar places childIds horizontally, centers controls and wraps at narrow widths; ToolbarGroup keeps related controls adjacent horizontally. These are existing canonical layout rules, not configurable direction/column props. Reuse existing control IDs as children and remove them from root flow; do not duplicate controls or add local CSS."},
  {id: "floating-control", source: "packages/json-document-ui-primitives-react/src/floating-surface.ts", components: ["toolbar", "popover", "product-inspector"], description: "floatingSurface.control/panel are style contracts applied to canonical controls, not independent empty elements. product-inspector presentation=floating is a persistent non-modal work panel with independent body scroll."},
  {id: "selection", source: "packages/json-document-ui-primitives-react/src/listbox.ts", components: ["selectable-item", "select"], description: "useListbox owns keyboard selection; contentInteractionAttributes and useInteractionHandle are behavior contracts, not visible components."},
  {id: "calendar-interaction", source: "packages/json-document-calendar/src/index.ts", components: ["calendar-month", "calendar-time", "calendar-event-inspector"], description: "Calendar hand, keyboard, pointer, rename and viewport hooks compose calendar views; date-values and event labels format their data."},
] as const;
export function assertUIComponentProperties(component: string, value: unknown): void {
  if (value === undefined) return;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("컴포넌트 props는 객체여야 합니다.");
  if (component === "number-field") {
    const p=value as Record<string,unknown>;
    if (p.precision !== undefined && (!Number.isInteger(p.precision) || Number(p.precision)<0 || Number(p.precision)>20)) throw new TypeError("소수 정밀도는 0~20의 정수입니다.");
    if (typeof p.min === "number" && typeof p.max === "number" && p.min>p.max) throw new TypeError("최솟값은 최댓값보다 클 수 없습니다.");
  }
  if (component === "people-picker" || component === "tag-picker") {
    const config=(value as Record<string,unknown>)[component === "people-picker" ? "people" : "options"];
    if (config !== undefined) {
      const items=config && typeof config === "object" ? (config as Record<string,unknown>).items : undefined;
      const name=component === "people-picker" ? "name" : "label";
      if (!Array.isArray(items) || items.length>1000 || items.some(item=>!item || typeof item!=="object" || typeof item.id!=="string" || !item.id.trim() || typeof item[name]!=="string" || !item[name].trim() || item.disabled!==undefined && typeof item.disabled!=="boolean" || ["description","src"].some(key=>item[key]!==undefined && typeof item[key]!=="string")) || new Set(items.map(item=>item.id)).size!==items.length) throw new TypeError("선택 후보의 고유 ID와 표시 이름을 확인해 주세요.");
      const selected=(value as Record<string,unknown>).selectedIds;
      if (component === "tag-picker" && selected!==undefined && (!Array.isArray(selected) || new Set(selected).size!==selected.length || selected.some(id=>!items.some(item=>item.id===id)))) throw new TypeError("선택한 분류 ID를 확인해 주세요.");
    }
  }
  if (component === "activity-feed") {
    const entries = (value as Record<string, unknown>).entries;
    if (entries !== undefined) {
      const records = entries && typeof entries === "object" ? (entries as Record<string, unknown>).items : undefined;
      if (!Array.isArray(records) || records.some(record => !record || typeof record !== "object" || !["id", "actor", "action", "dateTime", "timeLabel"].every(key => typeof record[key] === "string") || record.detail !== undefined && typeof record.detail !== "string")) throw new TypeError("활동 기록의 ID·작성자·행동·날짜·표시 시각을 확인해 주세요.");
    }
  }
  if (component === "stepper" && (value as Record<string, unknown>).currentIndex !== undefined && (!Number.isInteger((value as Record<string, unknown>).currentIndex) || Number((value as Record<string, unknown>).currentIndex) < 0)) throw new TypeError("현재 단계는 0 이상의 정수여야 합니다.");
  if (component === "page-header" && (value as Record<string, unknown>).level !== undefined && ![1,2].includes(Number((value as Record<string, unknown>).level))) throw new TypeError("헤더 제목 수준은 1 또는 2입니다.");
  const rules = schemaFor(component);
  for (const [key, item] of Object.entries(value)) {
    const rule = rules[key];
    const valid = rule && (rule.type === "files" ? Array.isArray(item) && item.every(file => file && typeof file === "object" && !Array.isArray(file) && Object.keys(file).every(key => ["name", "size"].includes(key)) && typeof file.name === "string" && typeof file.size === "number" && Number.isFinite(file.size) && file.size >= 0) : rule.type === "strings" ? Array.isArray(item) && item.every(v => typeof v === "string") : rule.type === "object" ? !!item && typeof item === "object" && !Array.isArray(item) : typeof item === rule.type && (rule.type !== "number" || Number.isFinite(item))) && (!rule.enum || rule.enum.includes(item as string));
    if (!valid) throw new TypeError(`${component}.${key}: 등록된 속성·타입·값을 확인해 주세요.`);
  }
}
