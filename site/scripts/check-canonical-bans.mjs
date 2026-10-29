import { globSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Canonical re-implementation bans: `pattern` must not appear in any file matched by `files`
// (globs relative to the repository root). A glob matching nothing is a stale ban and fails too.
const host = "site/src/routes/calendar-demo/CalendarDemoRoute.tsx";
const navigator = "site/src/routes/calendar-demo/calendar-demo-navigator.tsx";
const inspector = "packages/json-document-calendar/src/calendar-event-inspector.tsx";
const primitivesIndex = "packages/json-document-ui-primitives-react/src/index.ts";
const databaseHand = "packages/json-document-database/src/database-hand.tsx";
const databaseHands = "packages/json-document-database/src/database-hands.tsx";
const liveDemoSources = ["site/src/routes/**/*.tsx", "site/src/shared/{composer,demo-workbench,ui}/**/*.tsx"];
const routeSources = "site/src/{routes,shared/composer}/**/*.tsx";
const retired = "ActionButton|IconButton|ToggleButton|ChoiceChip|SegmentedControl|MenuItemButton|ProductToolbar";

export const bans = [
  // UI Primitive roles
  { files: liveDemoSources, exclude: ["site/src/routes/docs/**"], pattern: /<button\b/, reason: "Live Demo가 canonical UI Primitive를 우회합니다: raw <button>" },
  { files: liveDemoSources, exclude: ["site/src/routes/docs/**"], pattern: /<(?!button\b)[A-Za-z][^>]*\brole=["']button["']/, reason: "Live Demo가 canonical UI Primitive를 우회합니다: non-button role=button" },
  { files: liveDemoSources, exclude: ["site/src/routes/docs/**"], pattern: /<Toggle\b[^>]*\brole=["']tab["']/, reason: "Live Demo가 canonical UI Primitive를 우회합니다: tab을 Toggle로 우회" },
  { files: liveDemoSources, exclude: ["site/src/routes/docs/**"], pattern: new RegExp(`\\b(?:${retired})\\b|<Select\\b`), reason: "Live Demo가 canonical UI Primitive를 우회합니다: legacy component" },
  { files: primitivesIndex, pattern: new RegExp(`\\b(?:${retired}|Select)\\b`), reason: "외형/중복 public API가 복원됐습니다" },
  { files: primitivesIndex, pattern: /\b(?:CalendarGrid|RangeCalendar|DatePicker|DateRangePicker|HtmlDateField|calendarCells|calendarEventLabel|formatFileSize)\b/, reason: "UI Primitive 범주 밖 책임이 복원됐습니다" },
  { files: [databaseHand, databaseHands], pattern: /<button\b/, reason: "Database Hands가 Command 정본을 우회합니다." },
  { files: routeSources, exclude: ["site/src/routes/{calendar-demo,ui-primitives-catalog}/**"], pattern: /function\s+Action\b/, reason: "route-local Action alias가 Command 정본을 우회합니다" },
  {
    files: routeSources,
    exclude: [
      "site/src/routes/{calendar-demo,ui-primitives-catalog}/**",
      "site/src/shared/composer/ComposerDemo.tsx",
      "site/src/routes/connectors/react-hook-form/ReactHookFormConnectorLab.tsx",
      "site/src/routes/connectors/react/ReactConnectorLab.tsx",
      "site/src/routes/connectors/tanstack-table/TanStackTableConnectorLab.tsx",
    ],
    pattern: /<(?:button|input|select|textarea|dialog)\b/,
    reason: "native control 경계가 정본 role과 다릅니다",
  },
  {
    files: ["site/src/routes/calendar-demo/CalendarDemoRoute.tsx", "packages/json-document-calendar/src/{date-controls,calendar-event-inspector}.tsx", "site/src/routes/editing-demos/{Selection,Topology}DemoRoute.tsx", "site/src/routes/artifact-viewer/ArtifactViewerRoute.tsx"],
    pattern: /onValueChange=\{\(value\)[^\n]*\bas\b/,
    reason: "Choice consumer에 ID cast가 다시 생겼습니다",
  },
  { files: ["site/src/routes/**/*.tsx", "packages/json-document-{canvas,database}/src/**/*.tsx"], pattern: /\bProductApp\b|role=["']toolbar["']/, reason: "정본 shell/toolbar 우회가 있습니다" },
  { files: "site/src/routes/docs/*.tsx", exclude: ["site/src/routes/docs/{DocumentationPage,MarkdownViewer}.tsx"], pattern: /MarkdownViewer|markdownHeadings/, reason: "bypasses the canonical DocumentationPage composition" },
  { files: "site/src/**/*.{ts,tsx}", exclude: ["site/src/routes/adapters/virtual-selection/VirtualSelectionAdapterLab.tsx", "site/src/shared/ui/code-block.tsx"], pattern: /<pre\b/, reason: "renders a copyable raw <pre> outside the canonical CodeBlock surface" },

  // Interaction, affordance and content grammar
  { files: "packages/json-document-calendar/src/use-calendar-pointer-interactions.ts", pattern: /window\.addEventListener\(["']pointerup["']/, reason: "InteractionHandle local lifecycle 우회가 다시 생겼습니다" },
  { files: databaseHand, pattern: /onMouseDown=|setPointerCapture\(|window\.addEventListener\(["']mouseup["']/, reason: "InteractionHandle local lifecycle 우회가 다시 생겼습니다" },
  { files: "packages/json-document-canvas/src/canvas-object-view.tsx", pattern: /function handleResizePointer(?:Down|Move)/, reason: "InteractionHandle local lifecycle 우회가 다시 생겼습니다" },
  { files: "packages/json-document-annotation/src/annotation-hand.tsx", pattern: /function handleResizePointerDown/, reason: "InteractionHandle local lifecycle 우회가 다시 생겼습니다" },
  { files: host, pattern: /function\s+(?:contextualAffordance|resolveContextualPhase)\b/, reason: "Calendar Host에 contextual lifecycle 우회 구현이 생겼습니다" },
  { files: "site/src/routes/calendar-demo/calendar-demo-styles.ts", pattern: /selectedSlot:[^\n]*(?:bg-|ring-)/, reason: "제품 로컬 content interaction 시각 문법이 다시 생겼습니다" },
  { files: "site/src/routes/date-controls-demo/date-controls-demo-styles.ts", pattern: /timeSelectedSlot:[^\n]*(?:bg-|ring-)/, reason: "제품 로컬 content interaction 시각 문법이 다시 생겼습니다" },
  { files: "packages/json-document-database/styles.css", pattern: /td\[data-selected=true\]/, reason: "제품 로컬 content interaction 시각 문법이 다시 생겼습니다" },
  { files: "site/src/routes/calendar-demo/calendar-demo-styles.ts", pattern: /inspector:\s*"[^"]*(?:right-2|top-12)/, reason: "Calendar details retain consumer-local fixed placement" },

  // Sheet, Markdown, Database and Annotation owners
  { files: "packages/json-document-sheet/src/sheet-hand.tsx", pattern: /<input\b|\bsetDraft\b|\bevent\.key\b|String\.fromCharCode|Object\.fromEntries/, reason: "Sheet Hand retains displaced responsibility" },
  { files: "packages/json-document-editing/src/markdown-table.ts", pattern: /from\s+["'](?:react|react-dom)(?:\/[^"']*)?["']/, reason: "Markdown source editor must stay framework independent" },
  { files: "packages/json-document-editing/src/{markdown-table,object-sheet}.ts", pattern: /new Set|let unsubscribe/, reason: "bypasses the projected Sheet lifecycle" },
  { files: ["packages/json-document-react/src/use-editing.ts", "packages/json-document-sheet/src/sheet-range-selection.tsx"], pattern: /(?:event|input)\.shiftKey\s*\?\s*"extend"/, reason: "duplicates Web selection modifier translation" },
  { files: "site/src/routes/annotation-demo/AnnotationDemoRoute.tsx", pattern: /createGestureSession|projectWebClientPointToSVG|function AnnotationShape|function CommentComposer|presentStructuredSnapshot|JSON\.stringify|JSON\.parse|renderWebAnnotationRaster/, reason: "Annotation Demo owns displaced behavior" },
  { files: [databaseHand, databaseHands, "packages/json-document-zod/src/database-document.ts"], pattern: /property\.type === "number"\s*\?\s*Number\(|(?:currentTarget\.)?value === "true"/, reason: "bypasses canonical Database property value conversion" },
  { files: databaseHand, pattern: /clipboardData\.setData|onCopy=\{\s*\(event\)/, reason: "DatabaseHand bypasses the canonical Web Clipboard surface" },
  { files: "packages/json-document-database/src/contracts.ts", pattern: /DatabaseViewDocument/, reason: "Database Hand declares a parallel saved-view model" },
  { files: databaseHands, pattern: /JSON\.stringify\(before\)|JSON\.stringify\(row\)/, reason: "Database remote updates infer patches from full records" },
  { files: databaseHand, pattern: /function DefaultCell(?:(?!function filterItems)[\s\S])*property\.type === ["'](?:checkbox|select|number)["']/, reason: "Database property controls bypass the canonical React owner" },
  { files: databaseHands, pattern: /export function DatabaseRecordPanel(?:(?!export function DatabaseWorkspace)[\s\S])*property\.type === ["'](?:checkbox|select|number)["']/, reason: "Database property controls bypass the canonical React owner" },

  // Calendar Host and Calendar owners
  { files: "packages/json-document-editing/src/calendar-allday-pointer.ts", pattern: /addCalendarDate\(release\.targetDay, 1\)/, reason: "Calendar all-day event storage에 직접 +1일이 다시 생겼습니다" },
  { files: "packages/json-document-calendar-document/src/calendar-operation.ts", pattern: /addCalendarDate\(start, 1\)/, reason: "Calendar all-day event storage에 직접 +1일이 다시 생겼습니다" },
  { files: host, pattern: /addCalendarDate\((?:day|value), 1\)/, reason: "Calendar all-day event storage에 직접 +1일이 다시 생겼습니다" },
  { files: host, pattern: /addCalendarDate\(yearStart,\s*-7\)|addCalendarDate\(yearEnd,\s*14\)/, reason: "Calendar Host에 cell interval 중복이 다시 생겼습니다" },
  { files: navigator, pattern: /cells\[0\]\?\.date|cells\.at\(-1\)\?\.date/, reason: "Calendar Host에 cell interval 중복이 다시 생겼습니다" },
  { files: navigator, pattern: /<div\s+role=["']grid["']|cells\.map\s*\(/, reason: "Calendar Demo에 날짜 grid 재구현이 다시 생겼습니다" },
  { files: host, pattern: /calendarCells\(["']month["'],\s*monthStart\)\.map\s*\(/, reason: "Calendar Demo에 날짜 grid 재구현이 다시 생겼습니다" },
  { files: host, pattern: /\.slice\(0,\s*10\)/, reason: "Calendar Host에 날짜 부분 문자열 자르기가 다시 생겼습니다" },
  { files: host, pattern: /document\.calendars\s*\?\?\s*\[\]|document\.calendars\.find/, reason: "Calendar Host에 document calendar projection 우회가 다시 생겼습니다" },
  { files: inspector, pattern: /render(?:Field|Section)/, reason: "Calendar inspector의 자의적 구현이 다시 생겼습니다" },
  { files: host, pattern: /detailsEditing|useCalendarRenameInput|calendarRecurrenceWith(?:Frequency|Interval|Until)|aria-label=["']Edit occurrence["']/, reason: "Calendar inspector의 자의적 구현이 다시 생겼습니다" },
  { files: "packages/json-document-calendar/src/calendar-event-label.ts", pattern: /json-document-editing/, reason: "Calendar event label 경계 위반이 생겼습니다" },
  { files: host, pattern: /function monthEventLabel/, reason: "Calendar event label 경계 위반이 생겼습니다" },
  { files: host, pattern: /function clockNow|\.toString\(\{ smallestUnit: "minute" \}\)/, reason: "Calendar Host에 instant formatter 중복이 다시 생겼습니다" },
  { files: host, pattern: /addCalendarDate\([^\n]*\.end[^\n]*, -1\)/, reason: "Calendar Host에 exclusive-end 보정이 다시 생겼습니다" },
  { files: host, pattern: /(?:add|remove)EventListener\(["']keydown["']|calendarCommandFromWebKeyboardEvent/, reason: "Calendar Host에 Keyboard local lifecycle이 다시 생겼습니다" },
  { files: "packages/json-document-calendar/src/calendar-month-grid.tsx", pattern: /render(?:Cell|Event)/, reason: "Calendar 월간 표면의 자의적 구현이 다시 생겼습니다" },
  { files: host, pattern: /calendarMonthWeekLayout|calendarMonthDayLayout|function MonthEvent/, reason: "Calendar 월간 표면의 자의적 구현이 다시 생겼습니다" },
  { files: host, pattern: /function monthWeeks|index \+= 7/, reason: "Calendar Host에 월간 주 행 projection이 다시 생겼습니다" },
  { files: host, pattern: /Array\.from\(\{ length: 7 \},[^\n]*addCalendarDays|startOfIsoWeek\(visibleDate\)/, reason: "Calendar Host에 day/week cell projection이 다시 생겼습니다" },
  { files: [host, navigator, "packages/json-document-calendar/src/{date-controls,date-grid}.tsx"], pattern: /cell\.date\.slice\(8\)/, reason: "Calendar Host에 day/week cell projection이 다시 생겼습니다" },
  { files: host, pattern: /function periodLabel|date\.slice\(0, 4\)/, reason: "Calendar Host에 기간 label projection이 다시 생겼습니다" },
  { files: [host, navigator], pattern: /\.slice\(0,\s*7\)/, reason: "Calendar Host에 기간 label projection이 다시 생겼습니다" },
  { files: host, pattern: /monthWeekDayAt|getBoundingClientRect|closest\(["']\[data-calendar-week\]["']\)/, reason: "Calendar Host에 pointer 좌표 번역 또는 anchored floating 측정이 다시 생겼습니다" },
  { files: inspector, pattern: /as CalendarRecurrence\["freq"\]|Math\.max\(1, Math\.floor\(Number\(event\.target\.value\)|selectedEvent\.recurrence!/, reason: "Calendar Host에 recurrence model 전환이 다시 생겼습니다" },
  { files: host, pattern: /\b(?:naming|finishNaming|cancelNaming|commitTitle)\b|titleRef\.current\?\.(?:focus|select)\(/, reason: "Calendar Host에 Rename local lifecycle이 다시 생겼습니다" },
  { files: host, pattern: /planCalendarSelectionMove|createGestureSession|resolveMaterializedSelectionDragSource|type:\s*["']selection\.move["']/, reason: "Calendar Host에 Selection Drag 책임이 다시 생겼습니다" },
  { files: "packages/json-document-calendar/src/calendar-time-grid.tsx", pattern: /render(?:Cell|Event)/, reason: "Calendar day/week 표면의 자의적 구현이 다시 생겼습니다" },
  { files: host, pattern: /calendarAllDayLayout|calendarTimedLayout|calendarVisibleHourBand|data-calendar-grid=["']time["']/, reason: "Calendar day/week 표면의 자의적 구현이 다시 생겼습니다" },
  { files: host, pattern: /function clockLabel|slice\(11, 16\)/, reason: "Calendar Host에 시간 문구 projection이 다시 생겼습니다" },
  { files: "site/src/routes/calendar-demo/calendar-search.ts", pattern: /new Set\(\["day", "week", "month", "year"\]\)|as CalendarView/, reason: "Calendar route에 view membership 중복이 다시 생겼습니다" },
  { files: host, pattern: /\.scrollTop\s*=|new ResizeObserver\(|addEventListener\(["'](?:wheel|pointerdown)["']/, reason: "Calendar Host에 Viewport Position local lifecycle이 다시 생겼습니다" },
  { files: host, pattern: /function shiftView/, reason: "Calendar Host에 visible-date 이동 분기가 다시 생겼습니다" },
  { files: host, pattern: /function yearMonths|Array\.from\(\{ length: 12 \}/, reason: "Calendar Host에 연간 월 projection이 다시 생겼습니다" },
];

export const message = "Canonical re-implementation bans violated (consume the canonical owner instead):";

export default function canonicalBanViolations() {
  const cwd = fileURLToPath(new URL("../..", import.meta.url));
  const violations = [];
  for (const { files, exclude = [], pattern, reason } of bans) {
    const matched = globSync(files, { cwd, exclude });
    if (matched.length === 0) violations.push(`stale ban (no file matches ${files}): ${reason}`);
    for (const file of matched) {
      const source = readFileSync(`${cwd}${file}`, "utf8");
      const index = source.search(pattern);
      if (index >= 0) violations.push(`${file}:${source.slice(0, index).split("\n").length}: ${reason} (${pattern})`);
    }
  }
  return violations;
}
