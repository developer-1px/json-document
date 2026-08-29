import { useRef, useState, type ReactNode } from "react";
import {
  AuroraMass,
  BlobMass,
  BorderBeam,
  CloudMass,
  CometArc,
  DualRings,
  EqualizerBars,
  FadeSpokes,
  GradientSweep,
  HelixDots,
  HelixRings,
  HueOutline,
  InfinityStroke,
  LoadingBar,
  MassOrb,
  MorseCode,
  MorphSquare,
  OrbitDots,
  ParticleBurst,
  ProgressRing,
  PulsingDot,
  PulsingOrb,
  RadarSweep,
  RingMass,
  Shimmer,
  ShimmerText,
  Skeleton,
  StaggerLines,
  StreamingCaret,
  WaveDots,
  WaveGrid,
} from "@interactive-os/json-document-animation-react";
import "@interactive-os/json-document-animation-react/styles.css";
import {
  ActionButton,
  CalendarGrid,
  ChoiceChip,
  ContextualControls,
  ControlHandle,
  DatePicker,
  DateRangePicker,
  DisclosureButton,
  DragHandle,
  FileDropRegion,
  formatFileSize,
  GridCell,
  HtmlDateField,
  IconButton,
  Menu,
  ProductShell,
  RangeCalendar,
  ResizeHandle,
  Select,
  SelectableItem,
  SegmentedControl,
  Tabs,
  ToggleButton,
  ToolbarGroup,
  ToolbarLayout,
  ToolbarRegion,
  ToolbarSeparator,
  useListbox,
  type CalendarGrain,
  type DateRangeValue,
} from "@interactive-os/json-document-ui-primitives-react";
import {
  ChevronDown,
  Copy,
  Filter,
  GripVertical,
  Plus,
  Redo2,
  Undo2,
} from "lucide-react";
import { DemoPage } from "../../shared/demo-workbench/DemoPage";
import { PageHeader } from "../../shared/ui/primitives";
import { classes, ui } from "../../shared/ui/styles";
import {
  tokenColorClass,
  tokenRadiusClass,
  tokenShadowClass,
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
    <DemoPage documentation={(
      <PageHeader label="UI Primitives" title="Design system" illustration="braces">
        토큰과 정본 primitive의 역할·상태·keyboard·focus를 한 페이지에서 보여 줍니다.
      </PageHeader>
    )}>
      <div className={styles.catalog()} data-testid="design-system-catalog">
        <CatalogSection title="Tokens" description="Semantic color, type, corner, and elevation. Host styles consume these roles, never reference pigments.">
          <div className={styles.swatchGrid()}>
            {Object.entries(tokenColorClass).map(([name, fill]) => (
              <div key={name} className={styles.swatch()}>
                <div className={classes(styles.swatchChip(), fill)} data-testid={`token-color-${name}`} />
                <p className={classes("m-0", ui.text.meta)}>{name}</p>
              </div>
            ))}
          </div>
          <div className={styles.typeRow()}>
            <p className={classes("m-0", ui.text.title)}>Page title</p>
            <p className={classes("m-0", ui.text.heading)}>Section heading</p>
            <p className={classes("m-0", ui.text.body)}>Body copy keeps role, state, and feedback readable.</p>
            <p className={classes("m-0", ui.text.label)}>Overline label</p>
            <p className={classes("m-0", ui.text.meta)}>Meta and supporting detail</p>
          </div>
          <div className={styles.metricRow()}>
            {Object.entries(tokenRadiusClass).map(([name, radius]) => (
              <div key={name} className={classes(styles.radiusBox(), radius)}>{name}</div>
            ))}
          </div>
          <div className={styles.metricRow()}>
            {Object.entries(tokenShadowClass).map(([name, shadow]) => (
              <div key={name} className={classes(styles.shadowBox(), shadow)}>{name}</div>
            ))}
          </div>
        </CatalogSection>

        <CatalogSection title="Controls" description="Action, toggle, icon, chip, segmented, tabs, selectable, and disclosure. Disabled and selected states stay on the same hooks.">
          <div className={styles.row()}>
            <ActionButton kind="primary">Save</ActionButton>
            <ActionButton kind="secondary">Cancel</ActionButton>
            <ActionButton kind="danger">Delete</ActionButton>
            <ActionButton kind="primary" disabled>Disabled</ActionButton>
          </div>
          <div className={styles.row()}>
            <ToggleButton label="Filter ready rows" pressed={pressed} onClick={() => setPressed((value) => !value)}>
              <Filter aria-hidden="true" size={16} />
            </ToggleButton>
            <IconButton label="Copy"><Copy aria-hidden="true" size={16} /></IconButton>
            <IconButton label="Copy disabled" disabled><Copy aria-hidden="true" size={16} /></IconButton>
            <ChoiceChip selected={density === "compact"} onClick={() => setDensity("compact")}>Compact</ChoiceChip>
            <ChoiceChip selected={density === "comfortable"} onClick={() => setDensity("comfortable")}>Comfortable</ChoiceChip>
          </div>
          <SegmentedControl
            label="View"
            value={view}
            options={[{ id: "canvas", label: "Canvas" }, { id: "json", label: "JSON" }]}
            onValueChange={setView}
          />
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
          <ul className={styles.list()}>
            {[{ id: "inbox", label: "Inbox" }, { id: "today", label: "Today" }].map((item) => (
              <li key={item.id}>
                <SelectableItem
                  selected={selectedItem === item.id}
                  focus={focusedItem === item.id}
                  className={classes("w-full text-left", ui.surface.selectableBlock)}
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
          <DisclosureButton expanded={detailsOpen} controls="design-system-details" onClick={() => setDetailsOpen((value) => !value)}>
            <span>Details</span>
            <ChevronDown aria-hidden="true" size={16} />
          </DisclosureButton>
          {detailsOpen ? (
            <div id="design-system-details" className={styles.panel()}>
              <p className={classes("m-0", ui.text.meta)}>Disclosure keeps expanded state on the button and leaves markup to the Host.</p>
            </div>
          ) : null}
        </CatalogSection>

        <CatalogSection title="Shell and toolbar" description="ProductShell owns toolbar, canvas, and inspector. ToolbarLayout keeps start, center, and end on independent axes.">
          <ProductShell
            toolbarLabel="Catalog controls"
            inspector={<p className={classes("m-0", ui.text.meta)}>Inspector</p>}
            toolbar={(
              <ToolbarLayout>
                <ToolbarRegion placement="start" label="History">
                  <ToolbarGroup label="History">
                    <IconButton label="Undo"><Undo2 aria-hidden="true" size={16} /></IconButton>
                    <IconButton label="Redo" disabled><Redo2 aria-hidden="true" size={16} /></IconButton>
                  </ToolbarGroup>
                </ToolbarRegion>
                <ToolbarRegion placement="center" label="View">
                  <SegmentedControl
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
                        {context.visible.includes("duplicate") ? <ActionButton>Duplicate</ActionButton> : null}
                        {context.visible.includes("delete") ? <ActionButton kind="danger">Delete</ActionButton> : null}
                      </>
                    )}
                  </ContextualControls>
                </ToolbarRegion>
              </ToolbarLayout>
            )}
          >
            <div className={styles.shellCanvas()}>
              <p className={classes("m-0", ui.text.meta)}>Hover or focus the end region, or select Today, to reveal contextual actions.</p>
            </div>
          </ProductShell>
        </CatalogSection>

        <CatalogSection title="Overlays" description="Select, Menu, and useListbox own keyboard, typeahead, and focus restore. Host owns values and option copy.">
          <div className={styles.row()}>
            <Select
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
            <p className={classes("m-0", ui.text.meta)} data-testid="design-system-menu-action">Last menu action: {menuAction}</p>
          </div>
          <ul
            tabIndex={0}
            className={classes(styles.list(), ui.state.focus)}
            {...listbox.listboxProps}
          >
            {commandItems.map((item) => (
              <SelectableItem
                key={item.id}
                selected={selectedCommand === item.id}
                focus={activeCommand === item.id}
                className={classes("w-full text-left", ui.surface.selectableBlock)}
                {...listbox.optionProps(item)}
              >
                {item.textValue}
              </SelectableItem>
            ))}
          </ul>
        </CatalogSection>

        <CatalogSection title="Date and time" description="HTML date values and APG calendar grids commit canonical strings only.">
          <div className={styles.stack()}>
            <HtmlDateField type="date" label="Date" value={date} onValueChange={setDate} />
            <HtmlDateField type="time" label="Time" value={time} onValueChange={setTime} />
            <HtmlDateField type="datetime-local" label="DateTime" value={dateTime} onValueChange={setDateTime} />
            <HtmlDateField type="month" label="Month" value={month} onValueChange={setMonth} />
            <HtmlDateField type="week" label="Week" value={week} onValueChange={setWeek} />
            <DatePicker label="Picker date" value={date} onValueChange={setDate} />
            <DateRangePicker label="Picker range" value={range} onValueChange={setRange} />
            <CalendarGrid
              label="Calendar"
              value={date}
              grain={grain}
              visibleDate={date}
              onValueChange={setDate}
              onGrainChange={setGrain}
              onVisibleDateChange={setDate}
            />
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
        </CatalogSection>

        <CatalogSection title="Surfaces" description="Grid cells, file drop, and interaction handles project selection and pointer lifecycle without owning product policy.">
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
            <div className={styles.handleCard()} style={{ transform: `translate(${drag.x}px, ${drag.y}px)` }}>
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
              <span className={ui.text.meta}>DragHandle</span>
            </div>
            <div className={styles.resizePanel()} style={{ width }}>
              <span className={ui.text.meta}>ResizeHandle</span>
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
            </div>
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
          </div>
        </CatalogSection>

        <CatalogSection title="Wait animations" description="Generation-wait visuals. Status copy stays with the Host; motion slots stay on data-ui-animation hooks.">
          <div className={styles.motionGrid()}>
            <Motion title="Mass orb"><MassOrb /></Motion>
            <Motion title="Ring mass"><RingMass /></Motion>
            <Motion title="Cloud mass"><CloudMass /></Motion>
            <Motion title="Blob mass"><BlobMass className={styles.massFill()} /></Motion>
            <Motion title="Aurora mass" wide><AuroraMass className={styles.massFill()} /></Motion>
            <Motion title="Shimmer text"><ShimmerText>Thinking…</ShimmerText></Motion>
            <Motion title="Spectrum shimmer"><ShimmerText tone="spectrum">Listening…</ShimmerText></Motion>
            <Motion title="Wave dots"><WaveDots frame="bubble" /></Motion>
            <Motion title="Wave grid"><WaveGrid /></Motion>
            <Motion title="Streaming caret" wide>
              <span>
                Start with the user goal
                <StreamingCaret />
              </span>
            </Motion>
            <Motion title="Pulsing dot"><PulsingDot /></Motion>
            <Motion title="Morse code"><MorseCode /></Motion>
            <Motion title="Orbit dots"><OrbitDots /></Motion>
            <Motion title="Equalizer"><EqualizerBars /></Motion>
            <Motion title="Pulsing orb"><PulsingOrb /></Motion>
            <Motion title="Progress ring"><ProgressRing /></Motion>
            <Motion title="Dual rings"><DualRings /></Motion>
            <Motion title="Fade spokes"><FadeSpokes /></Motion>
            <Motion title="Radar sweep"><RadarSweep /></Motion>
            <Motion title="Infinity stroke"><InfinityStroke /></Motion>
            <Motion title="Morph square"><MorphSquare /></Motion>
            <Motion title="Comet arc"><CometArc /></Motion>
            <Motion title="Helix dots"><HelixDots /></Motion>
            <Motion title="Particle burst"><ParticleBurst /></Motion>
            <Motion title="Helix rings"><HelixRings /></Motion>
            <Motion title="Loading bar" wide><LoadingBar className={styles.bar()} /></Motion>
            <Motion title="Skeleton">
              <div className={styles.bar()}>
                <Skeleton shape="avatar" />
                <Skeleton shape="line" />
                <Skeleton shape="block" />
              </div>
            </Motion>
            <Motion title="Stagger lines"><StaggerLines className={styles.bar()} /></Motion>
            <Motion title="Shimmer" wide><Shimmer className={styles.bar()} /></Motion>
            <Motion title="Gradient sweep"><GradientSweep className={styles.identity()}>Generating a response</GradientSweep></Motion>
            <Motion title="Border beam"><BorderBeam className={styles.identity()}>Working on it</BorderBeam></Motion>
            <Motion title="Hue rim" wide><HueOutline className={styles.identity()}>Spectrum rim</HueOutline></Motion>
          </div>
        </CatalogSection>
      </div>
    </DemoPage>
  );
}

function CatalogSection(props: {
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
}) {
  return (
    <section className={styles.section()} aria-labelledby={`design-system-${props.title.toLowerCase().replace(/\s+/g, "-")}`}>
      <div>
        <h2 id={`design-system-${props.title.toLowerCase().replace(/\s+/g, "-")}`} className={classes("mb-1 mt-0", ui.text.heading)}>{props.title}</h2>
        <p className={classes("m-0", ui.text.meta)}>{props.description}</p>
      </div>
      {props.children}
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
