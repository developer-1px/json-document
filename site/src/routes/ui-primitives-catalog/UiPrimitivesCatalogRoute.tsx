import {DataPresentationSpecimen} from "./DataPresentationSpecimen";
import {DomainCardsSpecimen} from "./DomainCardsSpecimen";
import {ProductWorkflowSpecimen} from "./ProductWorkflowSpecimen";
import {InputFieldsSpecimen, RecordRowsSpecimen} from "./BasicAffordancesSpecimen";
import {ElapsedTime, Stepper, type WorkflowStep, SemanticIcon, ContentCard, FormField, StatusBadge, IssueRow, RecordFacts, ProductInspector} from "@interactive-os/json-document-ui-primitives-react";
import { contentPresentation, floatingSurface, Toolbar } from "@interactive-os/json-document-ui-primitives-react";
import { createContext, useContext, useId, useRef, useState, type ReactNode } from "react";
import {
  ProgressRing,
  ShimmerText,
  WaveDots,
  LoadingBar,
  Skeleton,
  StreamingCaret,
} from "@interactive-os/json-document-animation-react";
import "@interactive-os/json-document-animation-react/styles.css";
import {
  CalendarGrid,
  DatePicker,
  DateRangePicker,
  HtmlDateField,
  RangeCalendar,
  type CalendarGrain,
  type DateRangeValue,
} from "@interactive-os/json-document-calendar";
import {
  Check,
  Command,
  contentInteractionAttributes,
  Toggle,
  ContextualControls,
  EditingControls,
  ControlHandle,
  Dialog,
  DisclosureButton,
  DragHandle,
  FileDropRegion,
  Field,
  GridCell,
  Menu,
  Popover,
  ProductShell,
  ResizeHandle,
  Choice,
  Search,
  SelectableItem,
  Tabs,
  ToolbarGroup,
  ToolbarLayout,
  ToolbarRegion,
  ToolbarSeparator,
  useListbox,
  ValueInput,
} from "@interactive-os/json-document-ui-primitives-react";
import { formatFileSize } from "@interactive-os/json-document-file-intake";
import {
  ChevronDown,
  Copy,
  Filter,
  GripVertical,
  Plus,
  Redo2,
  Undo2,
} from "lucide-react";
import { PageFrame, PageHeader } from "../../shared/ui/primitives";
import { classes } from "../../shared/ui/styles";
import {
  tokenColorClass,
  tokenRadiusClass,
  tokenShadowClass as tokenElevationClass,
  uiPrimitivesCatalog,
} from "./ui-primitives-catalog-styles";

const styles = uiPrimitivesCatalog();
const CatalogSelection = createContext("Data presentation");
const catalogGroups = [
  {id:"foundation",label:"기초",sections:["Tokens","Wait animations"]},
  {id:"content",label:"콘텐츠",sections:["Data presentation","Date and time","Content"]},
  {id:"controls",label:"컨트롤",sections:["Controls","Surfaces","Floating controls","Overlays"]},
  {id:"composition",label:"조합",sections:["Record workflow","Domain cards","Shell and toolbar","Product workflow"]},
] as const;
const catalogSections = catalogGroups.reduce<string[]>((sections,group)=>[...sections,...group.sections],[]);
const catalogLabels: Record<string,string> = {"Data presentation":"데이터 표현","Domain cards":"도메인 카드","Product workflow":"제품 조합","Record workflow":"레코드 조합","Content":"콘텐츠","Tokens":"토큰","Controls":"입력·선택","Floating controls":"플로팅 도구","Shell and toolbar":"작업 공간","Overlays":"오버레이","Date and time":"날짜·시간","Surfaces":"직접 조작","Wait animations":"로딩·진행"};
const commandItems = [
  { id: "save", textValue: "Save" },
  { id: "export", textValue: "Export" },
  { id: "archive", textValue: "Archive" },
] as const;
const modelOptions = [
  { id: "fast", label: "Fast" },
  { id: "precise", label: "Precise" },
  { id: "custom", label: "Custom", disabled: true },
] as const;
const menuItems = [
  { id: "duplicate", label: "Duplicate" },
  { id: "rename", label: "Rename" },
  { id: "delete", label: "Delete" },
] as const;

export function UiPrimitivesCatalogRoute() {
  const [section,setSection]=useState(() => {const hash=typeof window==="undefined"?"":window.location.hash;return catalogSections.find(title=>hash===`#design-system-${title.toLowerCase().replace(/\s+/g,"-")}`) ?? "Tokens";});
  const activeGroup = catalogGroups.find(group=>(group.sections as readonly string[]).includes(section)) ?? catalogGroups[0];
  const [replyStage, setReplyStage] = useState<"waiting" | "streaming" | "complete">("waiting");
  const [aiStartedAt, setAiStartedAt] = useState(Date.now);
  const [aiEndedAt, setAiEndedAt] = useState<number>();
  const [workflowStep, setWorkflowStep] = useState(0);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const workflowId = useId();
  const [uploadedFiles, setUploadedFiles] = useState(3);
  const [uploadCancelled, setUploadCancelled] = useState(false);
  const [surfaceAccepted, setSurfaceAccepted] = useState(false);
  const [surfaceSelected, setSurfaceSelected] = useState(false);
  const [pressed, setPressed] = useState(true);
  const [density, setDensity] = useState<"compact" | "comfortable">("compact");
  const [view, setView] = useState<"canvas" | "json">("canvas");
  const [tab, setTab] = useState<"document" | "selection">("document");
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [checked, setChecked] = useState(false);
  const [fieldValue, setFieldValue] = useState("");
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState(50);
  const [floatingOpen, setFloatingOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState("inbox");
  const [focusedItem, setFocusedItem] = useState("inbox");
  const [model, setModel] = useState("fast");
  const [menuAction, setMenuAction] = useState("none");
  const [activeCommand, setActiveCommand] = useState<string | null>("save");
  const [selectedCommand, setSelectedCommand] = useState("save");
  const [shellView, setShellView] = useState<"canvas" | "json">("canvas");
  const [date, setDate] = useState("2026-08-03");
  const [time, setTime] = useState("09:30");
  const [dateTime, setDateTime] = useState("2026-08-03T09:30");
  const [month, setMonth] = useState("2026-08");
  const [week, setWeek] = useState("2026-W32");
  const [grain, setGrain] = useState<CalendarGrain>("month");
  const [range, setRange] = useState<DateRangeValue>({ start: "2026-08-03", end: "2026-08-07" });
  const [files, setFiles] = useState<ReadonlyArray<{ readonly name: string; readonly size: string }>>([]);
  const [gridFocus, setGridFocus] = useState("a1");
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const dragOrigin = useRef(drag);
  const [width, setWidth] = useState(180);
  const widthOrigin = useRef(width);
  const [control, setControl] = useState({ x: 40, y: 40 });
  const controlOrigin = useRef(control);
  const listbox = useListbox({
    id: "design-system-listbox",
    label: "Commands",
    items: commandItems,
    activeId: activeCommand,
    selectedId: selectedCommand,
    wrap: true,
    onActiveChange: setActiveCommand,
    onAction: setSelectedCommand,
  });

  return (
    <PageFrame>
      <PageHeader label="UI Primitives" title="Design system" illustration="braces">
        기초 토큰에서 콘텐츠와 컨트롤로, 다시 레코드와 제품 화면으로 조립되는 순서로 살펴보세요.
      </PageHeader>
      <div className={styles.catalog()} data-testid="design-system-catalog">
        <div className="sticky top-0 z-20 grid gap-related bg-background-canvas"><Choice label="디자인 시스템 구성 단계" presentation="inline" value={activeGroup.id} options={catalogGroups.map(group=>({id:group.id,label:group.label}))} onValueChange={id=>{const next=catalogGroups.find(group=>group.id===id)!.sections[0];setSection(next);window.history.replaceState(null,"",`#design-system-${next.toLowerCase().replace(/\s+/g,"-")}`);}}/>
        <Tabs label={`${activeGroup.label} 구성 요소`} value={section} options={activeGroup.sections.map(id=>({id,label:catalogLabels[id]}))} onValueChange={id=>{setSection(id);window.history.replaceState(null,"",`#design-system-${id.toLowerCase().replace(/\s+/g,"-")}`);}} tabId={id=>`catalog-tab-${id.toLowerCase().replace(/\s+/g,"-")}`} panelId={id=>`catalog-panel-${id.toLowerCase().replace(/\s+/g,"-")}`} className="flex flex-wrap gap-related" /></div>
        <CatalogSelection.Provider value={section}><div role="tabpanel" id={`catalog-panel-${section.toLowerCase().replace(/\s+/g,"-")}`} aria-labelledby={`catalog-tab-${section.toLowerCase().replace(/\s+/g,"-")}`}>
        <CatalogSection title="Data presentation" description="데이터 의미와 스키마 역할로 읽기·쓰기를 매핑합니다. 수정 가능한 값도 기본은 읽기입니다."><DataPresentationSpecimen /></CatalogSection>
        <CatalogSection title="Domain cards" description="대화·작업·상품·변경·이력·근거를 보편적인 어포던스와 실제 상태 단서로 구분합니다."><DomainCardsSpecimen/></CatalogSection>
        <CatalogSection title="Product workflow" description="검색·선택·속성 변경·브리핑·메모·활동 기록을 실제 조작하는 MOCK 업무 화면."><ProductWorkflowSpecimen /></CatalogSection>
        <CatalogSection title="Record workflow" description="목록 탐색·일괄 선택·행별 명령·속성 변경의 적용 범위를 구분합니다.">
          <RecordRowsSpecimen/>
        </CatalogSection>
        <CatalogSection featured title="Content" description="읽는 콘텐츠와 조작하는 컨트롤은 역할이 다릅니다. 같은 글꼴과 토큰 안에서 제목·본문·수치의 위계를 유지합니다.">
          <section aria-label="그룹에 맞는 표면" className="grid gap-region">
            <header className={contentPresentation.group}><h2 className={contentPresentation.heading}>같은 문의, 다른 그룹의 역할</h2><p className={contentPresentation.caption}>MOCK 문의의 내용·처리 과업·선택·보조 맥락을 비교합니다. 표면은 구획이나 행동을 전달할 때 사용합니다.</p></header>
            <div className="grid items-start gap-region md:grid-cols-2">
              <section className={contentPresentation.group} aria-label="연속 콘텐츠 예시"><h3 className={contentPresentation.heading}>연속 읽기 · group</h3><p className={contentPresentation.caption}>선택한 문의 안에서 이어 읽는 내용. 부모가 이미 영역을 구획하므로 표면을 더하지 않습니다.</p><div className={contentPresentation.group}><h4 className={contentPresentation.itemTitle}>결제 후 주문이 보이지 않습니다</h4><p className={contentPresentation.body}>결제 안내는 받았지만 주문 목록이 비어 있습니다. 중복 결제 없이 확인하고 싶습니다.</p></div></section>
              <section className={contentPresentation.group} aria-label="독립 과업 예시"><h3 className={contentPresentation.heading}>독립 과업 · ContentCard</h3><p className={contentPresentation.caption}>자체 내용과 완료 행동이 있는 확인 과업. 행동은 본문과 분리하고 경계는 한 겹만 둡니다.</p><ContentCard title="주문 확인" actions={<Command disabled={surfaceAccepted} onClick={()=>setSurfaceAccepted(true)}>{surfaceAccepted ? "확인 완료" : "문의 내용 확인"}</Command>}><p className={contentPresentation.body}>결제 후 주문이 보이지 않습니다.</p><p className={contentPresentation.caption}>결제 안내는 받았지만 주문 목록이 비어 있습니다. 중복 결제 없이 확인하고 싶습니다.</p>{surfaceAccepted && <p role="status" className={contentPresentation.caption}>이 MOCK 문의의 내용을 확인했습니다.</p>}</ContentCard></section>
              <section className={contentPresentation.group} aria-label="선택 요약 예시"><h3 className={contentPresentation.heading}>대상 탐색 · IssueRow</h3><p className={contentPresentation.caption}>반복되는 대상에서 하나를 고릅니다. 제목·요약·상태를 역할로 표현하고 모든 필드 라벨을 반복하지 않습니다.</p><IssueRow title="결제 후 주문이 보이지 않습니다" summary="결제 안내는 받았지만 주문 목록이 비어 있습니다." status={<StatusBadge>접수</StatusBadge>} assignee="고객 A" selected={surfaceSelected} onSelect={()=>setSurfaceSelected(!surfaceSelected)} /></section>
              <section className={contentPresentation.group} aria-label="보조 맥락 예시"><h3 className={contentPresentation.heading}>보조 맥락 · ProductInspector</h3><p className={contentPresentation.caption}>주 본문 옆에서 고객·상태를 확인합니다. 페이지에 붙은 맥락이므로 floating 표면을 쓰지 않습니다.</p><ProductInspector heading="문의 속성" aria-label="표면 예시 문의 속성"><RecordFacts presentation="list" label="속성" items={[{id:"customer",label:"고객",value:"고객 A"},{id:"state",label:"처리 상태",value:<StatusBadge>접수</StatusBadge>}]} /></ProductInspector></section>
            </div>
          </section>
          <div className={contentPresentation.group}>
            <h2 className={contentPresentation.title}>오늘의 업무 브리핑</h2>
            <h3 className={contentPresentation.heading}>업무 요약과 제안</h3>
            <p className={contentPresentation.body}>읽을 내용에는 제목과 본문의 위계를, 버튼과 입력에는 일관된 조작 규칙을 적용합니다.</p>
            <p className={contentPresentation.caption}>오늘 처리할 업무</p>
            <h3 className={contentPresentation.itemTitle}>CSV 내보내기에서 한글이 깨져요</h3>
            <p className={contentPresentation.itemSummary}>Windows Excel에서 고객 목록을 열면 이름이 깨집니다.</p>
            <strong className={contentPresentation.value}>3</strong>
            <div><Command kind="primary">업무 확인</Command></div>
          </div>
        </CatalogSection>

        <CatalogSection title="Tokens" description="색·타이포·표면·간격의 정본. 콘텐츠 간격은 세 관계만 사용합니다.">
          <RecordFacts presentation="list" label="간격 체계" items={[{id:"related",label:"관련 요소 · 8px",value:"라벨과 값, 제목과 설명, 같은 작업의 요소"},{id:"group",label:"작업 그룹 · 16px",value:"입력과 실행, 결과와 메모 등 구분된 작업; 표면 inset"},{id:"region",label:"영역 구분 · 32px",value:"페이지·카탈로그의 주요 영역"}]} />

          <div className={styles.swatchGrid()}>
            {Object.entries(tokenColorClass).map(([name, fill]) => (
              <div key={name} className={styles.swatch()}>
                <div className={classes(styles.swatchChip(), fill)} data-testid={"token-color-" + name} />
                <p className={classes("m-0", contentPresentation.caption)}>{name}</p>
              </div>
            ))}
          </div>
          <div className={styles.tokenDetails()}>
            <div className={styles.tokenDetail()}>
              <p className={styles.eyebrow()}>Type</p>
              <div className={styles.typeRow()}>
                <p className={classes("m-0", contentPresentation.itemTitle)}>Page title</p>
                <p className={classes("m-0", contentPresentation.itemTitle)}>Section heading</p>
                <p className={classes("m-0", contentPresentation.itemSummary)}>Body copy keeps role, state, and feedback readable.</p>
                <p className={classes("m-0", contentPresentation.caption)}>Overline label</p>
                <p className={classes("m-0", contentPresentation.caption)}>Meta and supporting detail</p>
              </div>
            </div>
            <div className={styles.tokenDetail()}>
              <p className={styles.eyebrow()}>Shape</p>
              <div className={styles.metricRow()}>
                {Object.entries(tokenRadiusClass).map(([name, radius]) => (
                  <div key={name} className={classes(styles.radiusBox(), radius)}>{name}</div>
                ))}
              </div>
            </div>
            <div className={styles.tokenDetail()}>
              <p className={styles.eyebrow()}>Elevation</p>
              <div className={styles.metricRow()}>
                {Object.entries(tokenElevationClass).map(([name, elevation]) => (
                  <div key={name} className={classes(styles.shadowBox(), elevation)}>{name}</div>
                ))}
              </div>
            </div>
          </div>
        </CatalogSection>

        <CatalogSection title="Controls" description="입력과 선택의 역할을 구분하고, 같은 토큰으로 레이블·설명·상태를 연결합니다.">
          <InputFieldsSpecimen/>
          <div className={styles.controlGallery()}>
          <div className={classes(styles.controlGroup(), styles.controlWide())}>
          <div className={styles.controlScenarioHeader()}>
            <h3 className={styles.controlScenarioTitle()}>Review toolbar</h3>
            <span className={contentPresentation.caption}>Launch brief · unsaved</span>
          </div>
          <div className={styles.row()}>
            <Command affordance="persistent" kind="primary">Save</Command>
            <Command affordance="persistent" kind="secondary">Cancel</Command>
            <Command affordance="persistent" kind="danger">Delete</Command>
            <Command affordance="disabled-preview" kind="primary" disabled>Disabled</Command>
          </div>
          <div className={styles.controlToolbar()}>
            <span className={styles.controlSettingLabel()}>Utilities</span>
            <Toggle label="Filter ready rows" pressed={pressed} onClick={() => setPressed((value) => !value)}>
              <Filter aria-hidden="true" size={16} />
            </Toggle>
            <Command label="Copy"><Copy aria-hidden="true" size={16} /></Command>
            <Command label="Copy disabled" disabled><Copy aria-hidden="true" size={16} /></Command>
          </div>
          </div>
          <div className={classes(styles.controlGroup(), styles.controlWide())}>
          <div className={styles.controlScenarioHeader()}>
            <h3 className={styles.controlScenarioTitle()}>Canvas preferences</h3>
            <span className={contentPresentation.caption}>Configure the current document</span>
          </div>
          <div className={styles.controlSettingsGrid()}>
            <div className={styles.controlSetting()}>
              <p className={styles.controlSettingLabel()}>Content</p>
              <label className={styles.row()}>
                <Check label="Include archived" checked={checked} onCheckedChange={setChecked} />
                <span className={contentPresentation.caption}>Include archived</span>
              </label>
            </div>
            <FormField label="Document title">{control=><Field {...control} label="Document title" value={fieldValue} onValueChange={setFieldValue} placeholder="Untitled"/>}</FormField>
            <div className={styles.controlSetting()}>
              <p className={styles.controlSettingLabel()}>Find a command</p>
              <Search label="Search commands" query={query} onQueryChange={setQuery} />
            </div>
            <div className={styles.controlSetting()}>
              <p className={styles.controlSettingLabel()}>Continuous zoom</p>
              <ValueInput label="Zoom" value={zoom} min={25} max={200} step={25} presentation="continuous" onValueChange={setZoom} />
            </div>
            <div className={styles.controlSetting()}>
              <p className={styles.controlSettingLabel()}>Stepped zoom</p>
              <ValueInput label="Zoom steps" value={zoom} min={25} max={200} step={25} presentation="stepped" onValueChange={setZoom} />
            </div>
            <div className={styles.controlSetting()}>
              <p className={styles.controlSettingLabel()}>Display</p>
              <div className={styles.row()}>
                <Toggle pressed={density === "compact"} presentation="chip" onClick={() => setDensity("compact")}>Compact</Toggle>
                <Toggle pressed={density === "comfortable"} presentation="chip" onClick={() => setDensity("comfortable")}>Comfortable</Toggle>
              </div>
              <Choice presentation="inline"
                label="View"
                value={view}
                options={[{ id: "canvas", label: "Canvas" }, { id: "json", label: "JSON" }]}
                onValueChange={setView}
              />
            </div>
          </div>
          </div>
          <div className={styles.controlGroup()}>
          <div className={styles.controlScenarioHeader()}>
            <h3 className={styles.controlScenarioTitle()}>Content interaction</h3>
            <span className={contentPresentation.caption}>One state grammar across product content</span>
          </div>
          <ul className={styles.selectionList()}>
            <li><SelectableItem selected={false} className={styles.selectionItem()}>Rest</SelectableItem></li>
            <li><SelectableItem selected className={styles.selectionItem()}>Selected</SelectableItem></li>
            <li><SelectableItem selected active className={styles.selectionItem()}>Active</SelectableItem></li>
            <li><SelectableItem selected dragging className={styles.selectionItem()}>Dragging</SelectableItem></li>
            <li {...contentInteractionAttributes({ role: "drop-target", active: true })} className={styles.selectionItem()}>Drop target</li>
            <li {...contentInteractionAttributes({ role: "insertion", active: true })} className={styles.selectionItem()}>Insertion</li>
          </ul>
          </div>
          <div className={styles.controlGroup()}>
          <div className={styles.controlScenarioHeader()}>
            <h3 className={styles.controlScenarioTitle()}>Document inspector</h3>
            <span className={contentPresentation.caption}>Formatting stays attached to the selection</span>
          </div>
          <div className={styles.controlSplit()}>
            <div className={styles.controlSetting()}>
              <p className={styles.controlSettingLabel()}>Presentation</p>
              <div className={styles.row()}>
                <Popover label="Formatting" open={popoverOpen} onOpenChange={setPopoverOpen} trigger="Format" panelClassName={styles.panel()}>
                  <p className={classes("m-0", contentPresentation.caption)}>Anchored presentation</p>
                </Popover>
                <Command onClick={() => setDialogOpen(true)}>Open dialog</Command>
                <Dialog label="Document settings" open={dialogOpen} onOpenChange={setDialogOpen} className={styles.panel()}>
                  <p className={classes("m-0", contentPresentation.caption)}>Modal presentation</p>
                  <Command onClick={() => setDialogOpen(false)}>Close</Command>
                </Dialog>
              </div>
            </div>
            <div className={styles.controlSetting()}>
              <p className={styles.controlSettingLabel()}>Inspector scope</p>
              <Tabs
                label="Inspector values"
                value={tab}
                options={[{ id: "document", label: "Document" }, { id: "selection", label: "Selection" }]}
                onValueChange={setTab}
                tabId={(id) => `design-system-tab-${id}`}
                panelId={(id) => `design-system-panel-${id}`}
              />
              <div
                id="design-system-panel-document"
                role="tabpanel"
                aria-labelledby="design-system-tab-document"
                hidden={tab !== "document"}
                className={styles.panel()}
              >
                <p className={classes("m-0", contentPresentation.caption)}>Document panel</p>
              </div>
              <div
                id="design-system-panel-selection"
                role="tabpanel"
                aria-labelledby="design-system-tab-selection"
                hidden={tab !== "selection"}
                className={styles.panel()}
              >
                <p className={classes("m-0", contentPresentation.caption)}>Selection panel</p>
              </div>
            </div>
          </div>
          </div>
          <div className={styles.controlGroup()}>
          <div className={styles.controlScenarioHeader()}>
            <h3 className={styles.controlScenarioTitle()}>Inbox navigation</h3>
            <span className={contentPresentation.caption}>Select an item, then disclose its detail</span>
          </div>
          <div className={styles.controlSplit()}>
            <div className={styles.controlSetting()}>
              <p className={styles.controlSettingLabel()}>Location</p>
              <ul className={styles.selectionList()}>
                {[{ id: "inbox", label: "Inbox" }, { id: "today", label: "Today" }].map((item) => (
                  <li key={item.id}>
                    <SelectableItem
                      selected={selectedItem === item.id}
                      focus={focusedItem === item.id}
                      className={styles.selectionItem()}
                      onClick={() => {
                        setSelectedItem(item.id);
                        setFocusedItem(item.id);
                      }}
                    >
                      {item.label}
                    </SelectableItem>
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.controlSetting()}>
              <p className={styles.controlSettingLabel()}>Selected item</p>
              <DisclosureButton expanded={detailsOpen} controls="design-system-details" onClick={() => setDetailsOpen((value) => !value)}>
                <span>Details</span>
                
              </DisclosureButton>
              {detailsOpen ? (
                <div id="design-system-details" className={styles.panel()}>
                  <p className={classes("m-0", contentPresentation.caption)}>Disclosure keeps expanded state on the button and leaves markup to the Host.</p>
                </div>
              ) : null}
            </div>
          </div>
          </div>
          </div>
        </CatalogSection>

        <CatalogSection title="Floating controls" description="Canonical glass surfaces compose existing control Atoms; Hosts only place them.">
          <Toolbar label="Floating controls" className={`${floatingSurface.control} w-fit`}><Popover label="Floating panel" open={floatingOpen} onOpenChange={setFloatingOpen} trigger="Options" panelClassName={`${floatingSurface.panel} p-group`}>Shared floating surface</Popover></Toolbar>
        </CatalogSection>

        <CatalogSection title="Shell and toolbar" description="ProductShell owns toolbar, canvas, and inspector. ToolbarLayout keeps start, center, and end on independent axes.">
          <ProductShell
            toolbarLabel="Catalog controls"
            inspector={<p className={classes("m-0", contentPresentation.caption)}>Inspector</p>}
            toolbar={(
              <ToolbarLayout>
                <ToolbarRegion placement="start" label="History">
                  <ToolbarGroup label="History">
                    <Command label="Undo"><Undo2 aria-hidden="true" size={16} /></Command>
                    <Command label="Redo" disabled><Redo2 aria-hidden="true" size={16} /></Command>
                  </ToolbarGroup>
                </ToolbarRegion>
                <ToolbarRegion placement="center" label="View">
                  <Choice presentation="inline"
                    label="Shell view"
                    value={shellView}
                    options={[{ id: "canvas", label: "Canvas" }, { id: "json", label: "JSON" }]}
                    onValueChange={setShellView}
                  />
                </ToolbarRegion>
                <ToolbarRegion placement="end" label="Actions">
                  <EditingControls label="간단한 편집" choices={[{ id: "view", label: "보기", value: shellView, options: [{ id: "canvas", label: "Canvas" }, { id: "json", label: "JSON" }], onValueChange: value => setShellView(value as "canvas" | "json") }]}
                    onRequestEdit={() => setShellView("json")} requestLabel="선택 대상 자세히 보기" />
                  <ContextualControls
                    aria-label="Catalog contextual actions"
                    tabIndex={0}
                    selected={selectedItem === "today"}
                    capabilities={[
                      { id: "duplicate", phases: ["approach", "selected"] },
                      { id: "delete", phases: ["selected"] },
                    ]}
                  >
                    {(context) => (
                      <>
                        {context.visible.includes("duplicate") ? <Command>Duplicate</Command> : null}
                        {context.visible.includes("delete") ? <Command kind="danger">Delete</Command> : null}
                      </>
                    )}
                  </ContextualControls>
                </ToolbarRegion>
              </ToolbarLayout>
            )}
          >
            <div className={styles.shellCanvas()}>
              <article className={styles.shellArtifact()}>
                <p className={styles.eyebrow()}>Selected artifact</p>
                <h3 className={contentPresentation.itemTitle}>Launch narrative</h3>
                <div className={classes(styles.shellArtifactLine(), "w-full")} />
                <div className={classes(styles.shellArtifactLine(), "w-4/5")} />
                <p className={styles.bodyCopy()}>Contextual actions reveal at the toolbar edge when this artifact is selected.</p>
              </article>
            </div>
          </ProductShell>
        </CatalogSection>

        <CatalogSection title="Overlays" description="Choice, Menu, and useListbox own keyboard, typeahead, and focus restore. Host owns values and option copy.">
          <div className={styles.overlayGallery()}>
            <article className={styles.overlayScene()}>
              <div>
                <p className={styles.eyebrow()}>Anchored triggers</p>
                <h3 className={contentPresentation.itemTitle}>Commands appear at their source</h3>
              </div>
              <p className={styles.bodyCopy()}>Popup choices and menus borrow space only while the task needs them.</p>
              <div className={styles.row()}>
                <Choice presentation="popup"
                  label="Model"
                  value={model}
                  options={modelOptions}
                  onValueChange={setModel}
                  classNames={{
                    root: styles.menuRoot(),
                  }}
                />
                <Menu
                  label="Add"
                  trigger={<Plus aria-hidden="true" size={16} />}
                  items={menuItems}
                  onAction={setMenuAction}
                  classNames={{
                    root: styles.menuRoot(),
                  }}
                />
              </div>
              <p className={classes("m-0", contentPresentation.caption)} data-testid="design-system-menu-action">Last menu action: {menuAction}</p>
            </article>
            <article className={styles.overlayScene()}>
              <div>
                <p className={styles.eyebrow()}>Persistent listbox</p>
                <h3 className={contentPresentation.itemTitle}>Selection stays in the work surface</h3>
              </div>
              <p className={styles.bodyCopy()}>Keyboard focus and committed selection remain distinct and visible.</p>
              <ul
                tabIndex={0}
                className={classes(styles.selectionList(), contentPresentation.focus)}
                {...listbox.listboxProps}
              >
                {commandItems.map((item) => (
                  <SelectableItem
                    key={item.id}
                    selected={selectedCommand === item.id}
                    focus={activeCommand === item.id}
                    className={styles.selectionItem()}
                    {...listbox.optionProps(item)}
                  >
                    {item.textValue}
                  </SelectableItem>
                ))}
              </ul>
            </article>
          </div>
        </CatalogSection>

        <CatalogSection title="Date and time" description="HTML date values and APG calendar grids commit canonical strings only.">
          <div className={styles.stack()}>
            <div className={styles.dateGroup()}>
              <p className={classes(styles.dateGroupTitle(), styles.eyebrow())}>Native values</p>
              <HtmlDateField type="date" label="Date" value={date} onValueChange={setDate} />
              <HtmlDateField type="time" label="Time" value={time} onValueChange={setTime} />
              <HtmlDateField type="datetime-local" label="Date and time" value={dateTime} onValueChange={setDateTime} />
              <HtmlDateField type="month" label="Month" value={month} onValueChange={setMonth} />
              <HtmlDateField type="week" label="Week" value={week} onValueChange={setWeek} />
            </div>
            <div className={styles.dateGroup()}>
              <p className={classes(styles.dateGroupTitle(), styles.eyebrow())}>Point selection</p>
              <DatePicker label="Selected date" value={date} onValueChange={setDate} />
              <CalendarGrid
                label="Calendar"
                value={date}
                grain={grain}
                visibleDate={date}
                onValueChange={setDate}
                onGrainChange={setGrain}
                onVisibleDateChange={setDate}
              />
            </div>
            <div className={styles.dateGroup()}>
              <p className={classes(styles.dateGroupTitle(), styles.eyebrow())}>Range selection</p>
              <DateRangePicker label="Selected range" value={range} onValueChange={setRange} />
              <RangeCalendar
                label="Range calendar"
                value={range}
                grain={grain}
                visibleDate={range.start}
                onValueChange={setRange}
                onGrainChange={setGrain}
                onVisibleDateChange={() => undefined}
              />
            </div>
          </div>
        </CatalogSection>

        <CatalogSection title="Surfaces" description="Grid cells, file drop, and interaction handles project selection and pointer lifecycle without owning product policy.">
          <div className={styles.surfaceWorkspace()}>
            <aside className={styles.surfaceSidebar()} aria-label="Artifact list">
              <p className={styles.eyebrow()}>Artifacts</p>
              <table className={styles.gridTable()}>
                <thead>
                  <tr>
                    <th className={styles.gridHead()}>A</th>
                    <th className={styles.gridHead()}>B</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <GridCell
                      selected={gridFocus === "a1"}
                      focus={gridFocus === "a1"}
                      className={styles.gridCell()}
                      onClick={() => setGridFocus("a1")}
                    >
                      Inbox
                    </GridCell>
                    <GridCell
                      selected={gridFocus === "b1"}
                      focus={gridFocus === "b1"}
                      className={styles.gridCell()}
                      onClick={() => setGridFocus("b1")}
                    >
                      Draft
                    </GridCell>
                  </tr>
                </tbody>
              </table>
            </aside>
            <div className={styles.surfaceCanvas()}>
              <FileDropRegion
                className={styles.drop()}
                overlay={<span className={styles.dropOverlay()}>Drop files</span>}
                onFiles={(next) => setFiles(next.map((file) => ({ name: file.name, size: formatFileSize(file.size) })))}
              >
                <p className={classes("m-0", contentPresentation.caption)} data-testid="design-system-files">
                  {files.length === 0 ? "Drop files here" : files.map((file) => `${file.name} (${file.size})`).join(", ")}
                </p>
              </FileDropRegion>
              <div className={styles.handleStage()} data-testid="design-system-handles">
            <article className={styles.surfacePanel()} style={{ width, transform: `translate(${drag.x}px, ${drag.y}px)` }}>
              <header className={styles.surfacePanelHeader()}>
                <DragHandle
                  label="Move card"
                  className={styles.dragHandle()}
                  onHandle={(event) => {
                    if (event.phase === "start") dragOrigin.current = drag;
                    if (event.phase === "preview" || event.phase === "commit") {
                      setDrag({ x: dragOrigin.current.x + event.delta.dx, y: dragOrigin.current.y + event.delta.dy });
                    }
                  }}
                >
                  <GripVertical aria-hidden="true" size={16} />
                </DragHandle>
                <span className={contentPresentation.caption}>{gridFocus === "a1" ? "Inbox" : "Draft"} artifact</span>
              </header>
              <p className={classes("m-0", contentPresentation.caption)}>Drag the header, resize the edge, or move the anchor below.</p>
              <div className={styles.controlPlane()} aria-label="Control point plane">
                <ControlHandle
                  label="Move control point"
                  className={styles.controlHandle()}
                  style={{ left: control.x, top: control.y }}
                  onHandle={(event) => {
                    if (event.phase === "start") controlOrigin.current = control;
                    if (event.phase === "preview" || event.phase === "commit") {
                      setControl({ x: controlOrigin.current.x + event.delta.dx, y: controlOrigin.current.y + event.delta.dy });
                    }
                  }}
                />
              </div>
              <ResizeHandle
                label="Resize panel"
                orientation="horizontal"
                className={styles.resizeHandle()}
                onHandle={(event) => {
                  if (event.phase === "start") widthOrigin.current = width;
                }}
                onResize={(delta, phase) => {
                  if (phase === "preview" || phase === "commit") setWidth(Math.max(120, widthOrigin.current + delta));
                }}
              />
            </article>
              </div>
            </div>
          </div>
        </CatalogSection>

        <CatalogSection title="Wait animations" description="짧은 대기는 작은 신호로, 긴 대기는 진행 정보와 조작으로 알립니다. 도착할 콘텐츠에 맞는 익숙한 형태를 사용합니다." >
          <div className={styles.motionGrid()}>
            <Motion title="AI 상태 문구와 경과 시간" description="실행 중인 문구에는 글자 쉬머, 옆에는 실제 경과 시간을 표시합니다. 완료하면 쉬머를 멈추고 결과 문구와 소요 시간을 남깁니다.">
              <div className="grid w-full gap-group"><div className="flex items-center gap-related">{aiEndedAt === undefined ? <ShimmerText announce label="자료를 검토하고 있어요" className={contentPresentation.body}>자료를 검토하고 있어요</ShimmerText> : <span className={contentPresentation.body}>자료 검토 완료</span>}<ElapsedTime startedAt={aiStartedAt} endedAt={aiEndedAt}/></div><Toolbar label="AI 경과 시간 MOCK 조작"><Command onClick={()=>{if(aiEndedAt === undefined)setAiEndedAt(Date.now());else{setAiStartedAt(Date.now());setAiEndedAt(undefined);}}}>{aiEndedAt === undefined ? "검토 완료" : "검토 다시 시작"}</Command></Toolbar></div>
            </Motion>
            <Motion title="첫 응답 대기" description="아직 도착한 내용이 없을 때는 점 세 개를 보여줍니다. 첫 내용이 도착하면 같은 자리에서 본문과 커서로 바꾸고, 완료하면 커서도 사라집니다.">
              <div className="grid w-full gap-group"><div className="flex min-h-12 items-center text-foreground-muted">{replyStage === "waiting" ? <WaveDots announce label="첫 응답을 기다리고 있어요"/> : <p className={contentPresentation.body}>문의의 재현 조건과 확인 순서를 정리했습니다.{replyStage === "streaming" && <StreamingCaret/>}</p>}</div><Toolbar label="응답 도착 MOCK 조작"><Command onClick={()=>setReplyStage(value=>value === "waiting" ? "streaming" : value === "streaming" ? "complete" : "waiting")}>{replyStage === "waiting" ? "첫 내용 도착" : replyStage === "streaming" ? "응답 완료" : "다시 요청"}</Command></Toolbar></div>
            </Motion>
            <Motion title="단계별 작업" description="실행에서 받은 단계와 상태를 보여줍니다. 진행 중에는 요약 문구에 쉬머를 쓰고 완료하면 일반 문구로 바꿉니다. 시간만으로 단계를 완료시키지 않습니다.">
              <div className="grid w-full gap-group"><DisclosureButton aria-label={workflowStep === 3 ? "브리핑 준비 완료" : ["요청 확인 중","자료 조회 중","브리핑 작성 중"][workflowStep]} expanded={workflowOpen} controls={workflowId} onClick={()=>setWorkflowOpen(value=>!value)}>{workflowStep === 3 ? <span>브리핑 준비 완료</span> : <ShimmerText>{["요청 확인 중","자료 조회 중","브리핑 작성 중"][workflowStep]}</ShimmerText>}</DisclosureButton><div id={workflowId} hidden={!workflowOpen}><Stepper label="브리핑 실행 단계" steps={["요청 확인","자료 조회","브리핑 작성"].map<WorkflowStep>((label,index)=>({id:String(index),label,state:index < workflowStep ? "complete" : index === workflowStep ? "current" : "pending"}))}/></div><Toolbar label="단계 진행 MOCK 조작"><Command onClick={()=>setWorkflowStep(value=>value === 3 ? 0 : value+1)}>{workflowStep === 3 ? "단계 다시 시작" : "현재 단계 완료"}</Command></Toolbar></div>
            </Motion>
            <Motion title="도구 실행 상태" description="도구별 완료·실행·대기 상태를 구분합니다. 전체 완료율은 총 작업량을 아는 경우에만 따로 제공합니다.">
              <ul className="grid w-full list-none gap-group p-0">{[{name:"문서 검색",state:"완료"},{name:"관련 항목 조회",state:"실행 중"},{name:"결과 저장",state:"대기"}].map((tool,index)=><li key={tool.name} className="flex items-center justify-between gap-group"><span className="flex items-center gap-related">{index === 1 ? <ProgressRing/> : <SemanticIcon kind={index === 0 ? "complete" : "task"}/>}<span className={contentPresentation.body}>{tool.name}</span></span><StatusBadge tone={index === 1 ? "active" : "neutral"}>{tool.state}</StatusBadge></li>)}</ul>
            </Motion>
            <Motion title="완료율 없는 처리" description="총량을 모르는 백그라운드 작업에는 이동하는 막대를 씁니다. 경과 시간만으로 막대를 채우지 않습니다.">
              <div className="grid w-full gap-group"><span className={contentPresentation.body}>변경사항을 동기화하고 있어요</span><LoadingBar aria-label="동기화 진행 중"/></div>
            </Motion>
            <Motion title="짧은 확인" description="잠깐의 저장·확인은 작은 스피너와 상태 문구로 알립니다. 빠르게 끝난 작업을 위해 로딩을 억지로 유지하지 않습니다.">
              <div role="status" className="flex items-center gap-related text-sm text-foreground-default"><ProgressRing/><span>변경사항을 저장하고 있어요</span></div>
            </Motion>
            <Motion title="목록 불러오기" description="여러 사람이나 업무를 기다릴 때는 도착할 행의 모양을 유지합니다.">
              <div role="status" aria-label="담당자 목록을 불러오고 있습니다" className="grid w-full gap-group">{[0,1].map(row=><div key={row} className="flex items-center gap-group"><Skeleton shape="avatar"/><div className="grid min-w-0 flex-1 gap-related"><Skeleton shape="line" className="max-w-48"/><Skeleton shape="line" className="max-w-32"/></div></div>)}</div>
            </Motion>
            <Motion title="표 불러오기" description="비교할 자료를 기다릴 때는 열 정렬과 행 관계를 먼저 보여줍니다.">
              <div role="status" aria-label="재고 표를 불러오고 있습니다" className="grid w-full gap-group">{[0,1,2].map(row=><div key={row} className="grid grid-cols-3 gap-group"><Skeleton shape="line"/><Skeleton shape="line"/><Skeleton shape="line"/></div>)}</div>
            </Motion>
            <Motion title="문서 불러오기" description="긴 문서를 기다릴 때는 제목과 본문 구조를 유지합니다. 내용을 가짜 문장으로 채우지 않습니다.">
              <div role="status" aria-label="문서를 불러오고 있습니다" className="grid w-full gap-group"><Skeleton shape="line" className="max-w-48"/><div className="grid gap-related"><Skeleton shape="line"/><Skeleton shape="line"/><Skeleton shape="line" className="max-w-64"/></div></div>
            </Motion>
            <Motion title="파일 전송" description="전체 수량을 알면 실제 완료 비율을 보여줍니다. 오래 걸리는 작업은 진행 정보와 취소 수단을 함께 제공합니다.">
              <div className="grid w-full gap-group"><div className="flex items-center justify-between gap-related"><span className={contentPresentation.body}>{uploadCancelled ? "전송 취소됨" : uploadedFiles === 5 ? "전송 완료" : "파일을 전송하고 있어요"}</span><span className={contentPresentation.caption}>{uploadedFiles} / 5개</span></div><LoadingBar value={uploadedFiles * 20} aria-label="파일 전송 진행률"/><Toolbar label="파일 전송 MOCK 조작"><Command disabled={uploadedFiles === 5 || uploadCancelled} onClick={()=>setUploadedFiles(value=>Math.min(5,value+1))}>다음 파일 완료</Command><Command disabled={uploadedFiles === 5 || uploadCancelled} onClick={()=>setUploadCancelled(true)}>취소</Command></Toolbar></div>
            </Motion>
            <Motion title="응답 작성 중" description="긴 생성 작업도 도착한 문장부터 읽습니다. 새로운 내용이 들어오는 위치만 커서로 알립니다.">
              <p className={contentPresentation.body}>고객 문의의 재현 조건을 확인한 뒤 다음 단계를 정리합니다<StreamingCaret/></p>
            </Motion>
          </div>
          <p className={contentPresentation.caption}>MOCK 예제 · 화면이 바로 준비되면 로딩을 잠깐 보여주기 위해 지연하지 않습니다. 소요 시간을 알 수 없을 때는 작은 스피너와 상태 문구를 유지하며, 완료 비율을 만들지 않습니다.</p>
        </CatalogSection>
        </div></CatalogSelection.Provider>
      </div>
    </PageFrame>
  );
}

function CatalogSection(props: {
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
  readonly featured?: boolean;
}) {
  const active = useContext(CatalogSelection);
  const id = `design-system-${props.title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <section hidden={active!==props.title} style={active!==props.title?{display:"none"}:undefined} className={styles.section({ featured: props.featured })} aria-labelledby={id}>
      <div className={classes(styles.sectionIntro(), props.featured && "max-w-2xl")}>
        <h2 id={id} className={classes("mt-0 scroll-mt-24", contentPresentation.itemTitle)}>{catalogLabels[props.title] ?? props.title}</h2>
        <p className={classes("m-0", contentPresentation.caption)}>{props.description}</p>
      </div>
      <div className={styles.sectionStage()}>{props.children}</div>
    </section>
  );
}

function Motion(props: { readonly title: string; readonly description: string; readonly children: ReactNode }) {
  return <section className="grid min-w-0 content-start gap-group border-t border-line-subtle pt-group" aria-label={props.title}>
    <h3 className={contentPresentation.itemTitle}>{props.title}</h3>
    <div className="flex min-h-24 min-w-0 items-center">{props.children}</div>
    <p className={contentPresentation.caption}>{props.description}</p>
  </section>;
}
