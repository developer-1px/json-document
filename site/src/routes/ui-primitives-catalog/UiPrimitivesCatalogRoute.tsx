import { useRef, useState, type ReactNode } from "react";
import {
  AuroraMass,
  LoadingBar,
  ShimmerText,
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
  Toggle,
  ContextualControls,
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
  ArrowLeft,
  ChevronDown,
  Copy,
  Filter,
  GripVertical,
  MoreHorizontal,
  Plus,
  Redo2,
  Send,
  Sparkles,
  Undo2,
} from "lucide-react";
import { PageFrame, PageHeader } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import {
  tokenColorClass,
  tokenRadiusClass,
  tokenShadowClass as tokenElevationClass,
  uiPrimitivesCatalog,
} from "./ui-primitives-catalog-styles";

const styles = uiPrimitivesCatalog();
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
  const [pressed, setPressed] = useState(true);
  const [density, setDensity] = useState<"compact" | "comfortable">("compact");
  const [view, setView] = useState<"canvas" | "json">("canvas");
  const [tab, setTab] = useState<"document" | "selection">("document");
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [checked, setChecked] = useState(false);
  const [fieldValue, setFieldValue] = useState("");
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState(50);
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
        토큰과 정본 primitive의 역할·상태·keyboard·focus를 한 페이지에서 보여 줍니다.
      </PageHeader>
      <div className={styles.catalog()} data-testid="design-system-catalog">
        <nav className={styles.catalogIndex()} aria-label="Design system sections">
          {[
            "Showroom",
            "Tokens",
            "Controls",
            "Shell and toolbar",
            "Overlays",
            "Date and time",
            "Surfaces",
            "Wait animations",
          ].map((title) => (
            <a key={title} className={styles.catalogIndexLink()} href={`#design-system-${title.toLowerCase().replace(/\s+/g, "-")}`}>
              {title}
            </a>
          ))}
        </nav>
        <CatalogSection featured title="Showroom" description="The same small role set composed into quiet desktop products. Content leads; controls appear where the task needs them.">
          <Showroom />
        </CatalogSection>

        <CatalogSection title="Tokens" description="Semantic color, type, corner, and elevation. Host styles consume these roles, never reference pigments.">
          <div className={styles.swatchGrid()}>
            {Object.entries(tokenColorClass).map(([name, fill]) => (
              <div key={name} className={styles.swatch()}>
                <div className={classes(styles.swatchChip(), fill)} data-testid={"token-color-" + name} />
                <p className={classes("m-0", ui.text.meta)}>{name}</p>
              </div>
            ))}
          </div>
          <div className={styles.tokenDetails()}>
            <div className={styles.tokenDetail()}>
              <p className={styles.eyebrow()}>Type</p>
              <div className={styles.typeRow()}>
                <p className={classes("m-0", ui.text.title)}>Page title</p>
                <p className={classes("m-0", ui.text.heading)}>Section heading</p>
                <p className={classes("m-0", ui.text.body)}>Body copy keeps role, state, and feedback readable.</p>
                <p className={classes("m-0", ui.text.label)}>Overline label</p>
                <p className={classes("m-0", ui.text.meta)}>Meta and supporting detail</p>
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

        <CatalogSection title="Controls" description="Semantic roles stay canonical; label, icon, chip, inline, and popup are presentations.">
          <div className={styles.controlGallery()}>
          <div className={classes(styles.controlGroup(), styles.controlWide())}>
          <div className={styles.controlScenarioHeader()}>
            <h3 className={styles.controlScenarioTitle()}>Review toolbar</h3>
            <span className={ui.text.meta}>Launch brief · unsaved</span>
          </div>
          <div className={styles.row()}>
            <Command kind="primary">Save</Command>
            <Command kind="secondary">Cancel</Command>
            <Command kind="danger">Delete</Command>
            <Command kind="primary" disabled>Disabled</Command>
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
            <span className={ui.text.meta}>Configure the current document</span>
          </div>
          <div className={styles.controlSettingsGrid()}>
            <div className={styles.controlSetting()}>
              <p className={styles.controlSettingLabel()}>Content</p>
              <div className={styles.row()}>
                <Check label="Select row" checked={checked} onCheckedChange={setChecked} />
                <span className={ui.text.meta}>Include archived</span>
              </div>
            </div>
            <div className={styles.controlSetting()}>
              <p className={styles.controlSettingLabel()}>Document title</p>
              <Field label="Document title" value={fieldValue} onValueChange={setFieldValue} placeholder="Untitled" />
            </div>
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
            <h3 className={styles.controlScenarioTitle()}>Document inspector</h3>
            <span className={ui.text.meta}>Formatting stays attached to the selection</span>
          </div>
          <div className={styles.controlSplit()}>
            <div className={styles.controlSetting()}>
              <p className={styles.controlSettingLabel()}>Presentation</p>
              <div className={styles.row()}>
                <Popover label="Formatting" open={popoverOpen} onOpenChange={setPopoverOpen} trigger="Format" panelClassName={styles.panel()}>
                  <p className={classes("m-0", ui.text.meta)}>Anchored presentation</p>
                </Popover>
                <Command onClick={() => setDialogOpen(true)}>Open dialog</Command>
                <Dialog label="Document settings" open={dialogOpen} onOpenChange={setDialogOpen} className={styles.panel()}>
                  <p className={classes("m-0", ui.text.meta)}>Modal presentation</p>
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
                <p className={classes("m-0", ui.text.meta)}>Document panel</p>
              </div>
              <div
                id="design-system-panel-selection"
                role="tabpanel"
                aria-labelledby="design-system-tab-selection"
                hidden={tab !== "selection"}
                className={styles.panel()}
              >
                <p className={classes("m-0", ui.text.meta)}>Selection panel</p>
              </div>
            </div>
          </div>
          </div>
          <div className={styles.controlGroup()}>
          <div className={styles.controlScenarioHeader()}>
            <h3 className={styles.controlScenarioTitle()}>Inbox navigation</h3>
            <span className={ui.text.meta}>Select an item, then disclose its detail</span>
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
                <ChevronDown aria-hidden="true" size={16} />
              </DisclosureButton>
              {detailsOpen ? (
                <div id="design-system-details" className={styles.panel()}>
                  <p className={classes("m-0", ui.text.meta)}>Disclosure keeps expanded state on the button and leaves markup to the Host.</p>
                </div>
              ) : null}
            </div>
          </div>
          </div>
          </div>
        </CatalogSection>

        <CatalogSection title="Shell and toolbar" description="ProductShell owns toolbar, canvas, and inspector. ToolbarLayout keeps start, center, and end on independent axes.">
          <ProductShell
            toolbarLabel="Catalog controls"
            inspector={<p className={classes("m-0", ui.text.meta)}>Inspector</p>}
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
                <h3 className={styles.cardTitle()}>Launch narrative</h3>
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
                <h3 className={styles.cardTitle()}>Commands appear at their source</h3>
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
                    trigger: styles.trigger(),
                    listbox: styles.overlay(),
                    option: styles.option(),
                    focusedOption: styles.optionFocused(),
                    selectedOption: styles.optionSelected(),
                  }}
                />
                <Menu
                  label="Add"
                  trigger={<Plus aria-hidden="true" size={16} />}
                  items={menuItems}
                  onAction={setMenuAction}
                  classNames={{
                    root: styles.menuRoot(),
                    trigger: styles.trigger(),
                    popup: styles.overlay(),
                    item: styles.option(),
                  }}
                />
              </div>
              <p className={classes("m-0", ui.text.meta)} data-testid="design-system-menu-action">Last menu action: {menuAction}</p>
            </article>
            <article className={styles.overlayScene()}>
              <div>
                <p className={styles.eyebrow()}>Persistent listbox</p>
                <h3 className={styles.cardTitle()}>Selection stays in the work surface</h3>
              </div>
              <p className={styles.bodyCopy()}>Keyboard focus and committed selection remain distinct and visible.</p>
              <ul
                tabIndex={0}
                className={classes(styles.selectionList(), ui.state.focus)}
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
                <p className={classes("m-0", ui.text.meta)} data-testid="design-system-files">
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
                <span className={ui.text.label}>{gridFocus === "a1" ? "Inbox" : "Draft"} artifact</span>
              </header>
              <p className={classes("m-0", ui.text.meta)}>Drag the header, resize the edge, or move the anchor below.</p>
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

        <CatalogSection title="Wait animations" description="One canonical visual for each waiting role: ambient generation, inline status, determinate progress, content placeholder, and streaming response.">
          <div className={styles.motionGrid()}>
            <Motion title="Generative ambient" wide><AuroraMass className={styles.massFill()} /></Motion>
            <Motion title="Inline activity"><ShimmerText>Thinking…</ShimmerText></Motion>
            <Motion title="Determinate progress"><LoadingBar className={styles.bar()} /></Motion>
            <Motion title="Content placeholder">
              <div className={styles.bar()}>
                <Skeleton shape="avatar" />
                <Skeleton shape="line" />
                <Skeleton shape="block" />
              </div>
            </Motion>
            <Motion title="Streaming response">
              <span>
                Start with the user goal
                <StreamingCaret />
              </span>
            </Motion>
          </div>
        </CatalogSection>
      </div>
    </PageFrame>
  );
}

function Showroom(): ReactNode {
  const [documentMode, setDocumentMode] = useState<"read" | "edit">("read");
  const [inbox, setInbox] = useState<"brief" | "research" | "launch">("brief");
  const [resolved, setResolved] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<"fast" | "precise">("precise");

  return (
    <div className={styles.showroomGrid()}>
      <article className={styles.showroomWide()} aria-label="Document workspace showroom">
        <div className={styles.showroomBar()}>
          <Command label="Back"><ArrowLeft aria-hidden="true" size={16} /></Command>
          <span className={styles.showroomPath()}>Launch brief / Narrative</span>
          <div className={styles.showroomActions()}>
            <Choice
              presentation="inline"
              label="Document mode"
              value={documentMode}
              options={[{ id: "read", label: "Read" }, { id: "edit", label: "Edit" }]}
              onValueChange={setDocumentMode}
            />
            <Command label="More document actions"><MoreHorizontal aria-hidden="true" size={16} /></Command>
          </div>
        </div>
        <div className={styles.documentStage()} data-mode={documentMode}>
          <p className={styles.eyebrow()}>Product narrative · August 2026</p>
          <h3 className={styles.showroomTitle()}>The interface recedes.<br />The work remains.</h3>
          <p className={styles.leadCopy()}>
            A quiet system does not remove capability. It keeps the document legible and brings a small,
            predictable handle to the exact place where intent appears.
          </p>
          <p className={styles.bodyCopy()}>
            {documentMode === "edit"
              ? "Editing is active. Selection, history, and formatting remain available without replacing the page with control chrome."
              : "Reading stays primary. Navigation and mode are present, but neither competes with the argument on the page."}
          </p>
        </div>
      </article>

      <article className={styles.showroomCard()} aria-label="Inbox workspace showroom">
        <div className={styles.showroomBar()}>
          <div>
            <p className={styles.eyebrow()}>Inbox</p>
            <h3 className={styles.cardTitle()}>Review queue</h3>
          </div>
          <Toggle label="Show resolved" pressed={resolved} onClick={() => setResolved((value) => !value)}>
            <Filter aria-hidden="true" size={16} />
          </Toggle>
        </div>
        <div className={styles.inboxLayout()}>
          <nav aria-label="Review items" className={styles.inboxList()}>
            {([
              ["brief", "Launch brief", "2 notes"],
              ["research", "Market research", "Ready"],
              ["launch", "Launch checklist", resolved ? "Resolved" : "1 blocker"],
            ] as const).map(([id, title, meta]) => (
              <SelectableItem
                key={id}
                selected={inbox === id}
                focus={inbox === id}
                className={styles.inboxItem()}
                onClick={() => setInbox(id)}
              >
                <span>{title}</span><small>{meta}</small>
              </SelectableItem>
            ))}
          </nav>
          <section className={styles.inboxDetail()} aria-live="polite">
            <p className={styles.eyebrow()}>Selected artifact</p>
            <h4 className={styles.detailTitle()}>{({ brief: "Launch brief", research: "Market research", launch: "Launch checklist" })[inbox]}</h4>
            <p className={styles.bodyCopy()}>The content preview gets the room. Triage actions stay at the edge until this item is selected.</p>
            <div className={styles.showroomActions()}>
              <Command>Open</Command>
              <Command kind="primary">Resolve</Command>
            </div>
          </section>
        </div>
      </article>

      <article className={styles.showroomCard()} aria-label="Agent composer showroom">
        <div className={styles.agentStage()}>
          <Sparkles aria-hidden="true" size={18} />
          <div>
            <p className={styles.eyebrow()}>Agent workspace</p>
            <h3 className={styles.cardTitle()}>Keep the artifact in view</h3>
          </div>
          <p className={styles.leadCopy()}>The answer lands in the work surface, not inside a growing stack of assistant chrome.</p>
          <div className={styles.agentDraft()}>
            <p className={styles.bodyCopy()}>I tightened the opening and kept the supporting evidence attached to the paragraph it explains.</p>
          </div>
        </div>
        <div className={styles.composer()}>
          <Field label="Ask about this artifact" value={prompt} onValueChange={setPrompt} placeholder="Ask for a change…" className={styles.composerField()} />
          <Choice
            presentation="popup"
            label="Response mode"
            value={model}
            options={[{ id: "fast", label: "Fast" }, { id: "precise", label: "Precise" }]}
            onValueChange={setModel}
            classNames={{ root: styles.menuRoot(), trigger: styles.quietTrigger(), listbox: styles.overlay(), option: styles.option(), focusedOption: styles.optionFocused(), selectedOption: styles.optionSelected() }}
          />
          <Command kind="primary" label="Send request" disabled={prompt.trim() === ""}><Send aria-hidden="true" size={16} /></Command>
        </div>
      </article>
    </div>
  );
}

function CatalogSection(props: {
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
  readonly featured?: boolean;
}) {
  const id = `design-system-${props.title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <section className={styles.section({ featured: props.featured })} aria-labelledby={id}>
      <div className={classes(styles.sectionIntro(), props.featured && "max-w-2xl")}>
        <h2 id={id} className={classes("mb-1 mt-0 scroll-mt-14", ui.text.heading)}>{props.title}</h2>
        <p className={classes("m-0", ui.text.meta)}>{props.description}</p>
      </div>
      <div className={styles.sectionStage()}>{props.children}</div>
    </section>
  );
}

function Motion(props: { readonly title: string; readonly wide?: boolean; readonly children: ReactNode }) {
  return (
    <section className={classes(styles.specimen(), props.wide && styles.wide())} aria-label={props.title}>
      <h3 className={classes("m-0", ui.text.label)}>{props.title}</h3>
      <div className={classes(styles.motionStage(), ui.surface.raised)}>{props.children}</div>
    </section>
  );
}
