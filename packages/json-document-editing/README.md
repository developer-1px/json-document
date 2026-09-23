# @interactive-os/json-document-editing

The [EditingSession contract](../../standards/editing-session.md) separates common
state, observation, recovery and history-owner invariants from the current
TypeScript binding and local-history policies, with behavior evidence at each
owner. Implementations must preserve the applicable contract; domain clipboard,
input defaults and complete Hands profiles retain their own decisions. This is
not a Stable release declaration for every export in this package.

`EditingSession` observes snapshots by JSON value, not reference identity.
Fresh-copy JSONDocument implementations retain local history until an actual
external value change. Undo reverses each operation against its sequential
pre-state, including object `add` replacement and array index shifts. A
`historyGroup` composes all grouped inverse operations, including different paths.

Snapshots and their selections are immutable owned values. Subscriber failures
do not reject completed edits; reentrant notifications are delivered in revision
order. A returned result describes its own transition, even if a subscriber has
already performed another transition.
Every synchronized revision is published, including synchronization started by
a snapshot read or another command. A reader's subscription order cannot consume
the notification intended for another observer. Synchronization also catches up
with writes made by those observers before returning to a read or new command.

Domains can provide `mapSelection(selection, { before, after, change })` and
`reconcileSelection(selection, value)` to `createEditingSession`. Both are pure
callbacks and run before publication of an external value change, mapping first.
`change` is the matching applied change, or `null` when a lazy read or reentrant
write must catch up from snapshots alone. Mapping must support that case.
Reconciliation repairs validity without claiming to preserve logical positions.
All nine built-in editors reconcile external deletion using their own selection
families; Calendar retains valid off-screen occurrences. Rich Text maps stable
text IDs through external text replacement, including affinity and scalar boundaries.

Mapping and reconciliation must complete before the session advances its value,
selection, history status or revision. A thrown callback error leaves the last
coherent state retained; reads and commands retry synchronization and throw again
until it succeeds, before authoring another mutation. Successful recovery
publishes the coherent snapshot and invalidates local inverse history. Document
commits remain committed even if their observer-triggered reconciliation fails.
An edit whose own transition completed still returns its own success when a later
subscriber's document write cannot be reconciled; the next read surfaces that error.

External changes clear **local inverse history**, not an optional external
`EditingHistory` owner. Every domain editor accepts `{ history }`; Rich Text
accepts it in `RichTextEditorOptions`. The official Collaboration connection is
`createCollaborationEditingHistory(runtime)` from
`@interactive-os/json-document-collaboration/editing`.
Use it with the same runtime's document. Simply injecting a collaboration
document does not enable selective history.

The external owner defines undo steps. Collaboration uses one causal commit
per step; local `historyGroup` does not merge those steps. An explicit
`history: "ignore"` plan is rejected before mutation with
`history.ignore-unsupported` when an external history owner is configured.
Availability and history-only notifications come from that owner. Selection
before/after each editor-authored target is retained locally and mapped to the
current document on undo/redo. Selections are not added to the collaboration wire.
Unknown targets (for example, changes made before this editor existed) reconcile
the current selection instead of inventing historical selection.

An `EditingHistory` implementation returns `{ ok: true, target, change, status }`.
`change` is the operation's own `JSONAppliedChange`, or explicitly `null` when
only history changes. `status` is its resulting `EditingHistoryStatus` captured
before notifying subscribers, not a later live status. Editing does not infer
operation ownership from notification order. Custom implementations of the earlier
target-only result must supply both fields; the official connection supplies them.

If selection restoration throws after a successful external undo/redo, that
history operation has already committed. The session retains its result and
selection reference, and retries only selection restoration on the next read.
Further commands cannot author until restoration succeeds. Fix the callback or
recreate the editor; do not retry the history operation as if it were rejected.
Callback exceptions are programming errors, not `{ ok: false }` commit rejections.

## 비동기 준비 순서

`createEditingPreparationQueue<Value, Result>({ apply, onResult?, onPendingChange?, cancelCode?, errorCode? })`는
`enqueue(prepare, cancelPreparation?)`, `cancel()`, `isPending`을 제공합니다.
`prepare`는 `{ ok: true, value }` 또는 `{ ok: false, code, reason? }`를 즉시/Promise로
반환합니다. 준비는 병행할 수 있지만 `apply`는 입력 순서대로 동기 실행합니다.
준비 실패는 apply를 호출하지 않고, 취소는 대기 Promise를 settle하며 늦은 결과를 무시합니다.
기본 오류 코드는 `editing.preparation-cancelled`, `editing.preparation-failed`입니다. 기존 public binding은
`cancelCode/errorCode`로 자신의 오류 어휘를 유지할 수 있습니다.

queue는 문서·selection을 모르며 원자적 편집은 `apply`가 호출하는 정본 editor의 책임입니다.
이미 완료한 편집을 취소로 되돌리지 않습니다. Object의 `createObjectPasteSession`은
외부 문서/선택 변경에 취소하고, Composer의 첨부 준비는 typing 중 유지합니다.
각 요청의 History 단위도 실제 domain apply가 정합니다.
Usage·Source: [Canvas](/demo/canvas), [Composer](/demo/composer).

## Canvas 외부 내용 변환

`createCanvasClipboard(content, { bounds, textColor, fontSize, imageOffset?, contentGap? })`는
일반 텍스트, 이미지 목록, 순서 있는 글·이미지를 Object clipboard로 변환합니다.
`{ type: "mixed", items: CanvasClipboardItem[] }`의 item은 `{ type: "text", text }` 또는
`{ type: "image", source, width, height, label }`입니다. HTML parsing·이미지 decode는
Web 소유이며 이 API는 DOM이나 File을 받지 않습니다.

mixed는 입력 순서의 세로 흐름으로 배치합니다. `contentGap`의 기본값은 24이며 유한한
0 이상 값입니다. 전체 높이가 `bounds.height`를 넘으면 객체·글자 크기·간격을 같은 비율로
축소합니다. 이미지 비율은 유지하며 원본 CSS·Office layout이나 긴 글의 가독성을 보장하지
않습니다. 기존 text는 단일 객체, images는 `imageOffset`(기본 24)의 cascade를 유지합니다.
빈 입력·유효하지 않은 geometry는 예외로 거절합니다.

결과의 ID는 clipboard 내부 참조입니다. 실제 문서 ID 할당·선택·History는 Object paste가
소유하고 마지막 item이 primary가 됩니다. 변환 자체는 문서를 쓰지 않습니다.
Usage·Source: [Canvas](/demo/canvas).

## Editing identity and observation

`createEditingId(prefix)` supplies opaque UUID-based identities for Document,
Order, Object, Tree, Calendar and Rich Text. IDs do not restart per editor or
replica. Custom `createId` injection remains supported; its provider must ensure
uniqueness across all writers. Environments without `crypto.randomUUID` fail
explicitly with `editing.id-provider-unavailable`; no weak random fallback is used.

`createEditingIdAllocator(existingIds, createId, subject)` reads an iterable of
occupied IDs once and returns a function that reserves each newly allocated ID.
Use one allocator for a batch; the five structural editors share this owner.
Each call tries the injected provider at most 100 times before throwing
`createId did not produce a unique <subject> id`. The allocator covers its local
reservation set, not cross-replica uniqueness; the provider still owns that.

The last UI unsubscribe releases the session's document and external-history
observation connections. Local undo/redo validity is independent of UI subscriptions:
a one-shot change marker retains no session, history stack or UI callback and
releases itself on the next document change. Later reads invalidate local history
even if external edits returned the value to the previous snapshot. Fresh-copy
snapshots and document no-ops do not invalidate history. This does not replay every
unobserved intermediate selection or guarantee identical revision counts.
Unsubscribe is idempotent: calling an old release again cannot remove a new
subscription that reuses the same callback.
`DocumentEditor` moves existing blocks with JSON Patch `move`, preserving their
member identity when composed with a collaboration document.

Headless editing transactions, selection publication, clipboard coordination,
and history for `@interactive-os/json-document`. Structural selection state and
semantic interaction contracts come from `@interactive-os/json-document-selection`.

The package keeps browser rendering and input outside the core. Its first
domain slice is a small block document used by the official site demo.

Every domain editor accepts either an initial JSON value or an existing
`JSONDocument`. Passing an existing instance lets multiple Connectors observe
and commit the same canonical state while each editor keeps its own structural
selection and, by default, local history.

```ts
const document = createJSONDocument(initialSheet);
const sheet = createSheetEditor(document);
```

Its structural selection slices split into two reusable families without
pretending that every topology is the same:

- `Document`, `Order`, `Sheet`, and `Tree` use the range family.
  Ordered axes, visible projections and JSON Patch planning come from the
  canonical document/editor or external-model connector.
- `Object` uses the key family. Canonical platform geometry and hit-testing
  APIs supply stable object IDs to the editor; the Host composes that path.
  Its public `selection.set` accepts the shared `replace`, `extend`, and
  `toggle` vocabulary directly; `extend` has key-family union semantics.

All slices keep renderer, DOM, physical keyboard policy, geometry, and expansion
state outside the common engines. Value-changing transactions store forward and
inverse patches with `selectionBefore` and `selectionAfter`; selection-only,
no-op, canceled, preview, and remote-presence changes do not create local document
history. Native text selection remains input/editor-owned and connects through
an explicit edit lease rather than becoming a structural selection variant.

`selection.select-all` replaces the complete range selection in one publication.
Document selects from the first block's offset 0 to the last block's text end;
Order selects the full item order. Tree requires `topology` and selects its
visible IDs. Sheet uses its document axes or the supplied `topology` row/column
order. An empty universe clears selection. Repeating the operation preserves
content and document Undo/Redo; it still publishes one selection revision under
the existing session contract. Tree Copy/Cut still includes selected nodes'
descendants, and Sheet Copy/Cut still uses the primary rectangle.

```ts
documentEditor.dispatch({ type: "selection.select-all" });
orderEditor.dispatch({ type: "selection.select-all" });
treeEditor.dispatch({ type: "selection.select-all", topology: { visibleIds } });
sheetEditor.dispatch({ type: "selection.select-all", topology: { rowIds, columnIds } });
```

[Whole-selection conformance cases](tests/conformance/select-all.test.ts) cover
empty, single, repeated, reordered and filtered targets, one publication, and
document history retention. Usage: the Document, Order, Tree and Sheet demos.

`Database` keeps typed property schema and records in canonical JSON while its
saved Table views own property order, visibility, width, sort, and filter. The
editor projects each saved view into a visible record/property topology for
range selection, keeps native title/text caret state in the host, and restores
structural selection with record and view mutations through history.


`nextDatabasePropertySort(sort, propertyId)` is the canonical saved-view sort
transition: a property cycles through ascending, descending, and unsorted. UI
packages and Hosts share this rule instead of repeating local sort helpers.

`defaultDatabaseValue(property)`, `databaseValueFromText(property, value)`, and
`acceptsDatabaseValue(property, value)` are the canonical value semantics used
by Database editors, Hands, and schema connectors.

Visible order is a value, not a command. `LineTopology` and `GridTopology` are
the shared shapes. Sheet aliases Grid as `SheetTopology`. Database projects a
saved view into `{ recordIds, propertyIds }`. Tree takes host `visibleIds`.
Selection and clipboard read that line.

`projectTreeVisibility(nodes, expandedIds)` is the canonical Tree projection.
It publishes rows with hierarchy/ARIA facts and the matching `TreeTopology`.
`treeVisibilityNeighbor` resolves movement only within that projection.

`gridPointKey` and `gridPointFromKey` provide the canonical reversible string
identity when a selection or rendering adapter needs to key a `GridPoint`.

`Calendar` follows the owner-local [Calendar protocol profile](docs/calendar-profile.md).

The document model, validation, semantic operations and projections are owned by
`@interactive-os/json-document-calendar-document`; the existing exports here are
compatibility paths to that implementation. Editing owns selection, clipboard,
Intent execution and history, and consumes the Document Type's public plans.
`paste(clipboard)` defaults to `primaryOccurrence.start`, including later recurring
occurrences. The shared grammar binding is `tests/conformance/calendar-grammar.test.ts`.
The profile is also rendered on the site's Editing API page; it documents the
current RC implementation, not a frozen Official Hands wire standard.
`Calendar` keeps interval events `{ id, title, start, end, allDay }`. Timed
events use datetime-local strings; all-day events use exclusive-end dates.
`parseCalendarView` validates untrusted runtime values against the canonical
day, week, month, and year view contract while Hosts retain their own fallback policy.
`formatCalendarInstant` serializes a Temporal date-time to the canonical
datetime-local minute string while Hosts retain ownership of their clock source.
`calendarDocumentCalendars` projects the document's safe calendar collection,
and `calendarDocumentCalendar` owns id lookup while Hosts retain visual policy.
`calendarRecurrenceWithFrequency`, `calendarRecurrenceWithInterval`, and
`calendarRecurrenceWithUntil` own recurrence creation and inspector transitions;
Hosts only pass UI values and choose whether recurrence is disabled.
`createCalendarEditor` creates, moves while keeping duration, resizes start or
end, moves by day, deletes, and undoes on one document across day, week, month,
and year views. Its `copy`, `cut`, and `paste` methods preserve occurrence
duration and relative offsets, apply each mutation as one history transaction,
and expose `calendarClipboardFormat` as the domain-owned validation contract.
Calendar structural selection identifies an occurrence as
`{ eventId, occurrenceStart }` and stores materialized range targets from
`@interactive-os/json-document-selection`. `calendarOccurrenceTopology`
projects the visible date interval into the canonical date → all-day/timed →
start → stable-id order. Hosts pass that snapshot with `selection.set`; they do
not reproduce sorting or modifier semantics. `selectedOccurrences`,
`primaryOccurrence`, `copy`, and `cut` keep off-screen identities stable across
view changes while rendering intersects them with the current projection.
`cutEditingClipboard` is the canonical copy-before-remove lifecycle shared by
the public editors; each domain still owns its projection and removal plan.
`interpretCalendarTimeGridPointer`,
`interpretCalendarAllDayPointer`, and `interpretCalendarMonthPointer` map a
press-release to those intents from the origin event, not the current
selection. `calendarTimedLayout` places a timed event on its `start`/`end`
span. Calendar Hands own reusable grids and lifecycle, Web owns pixel-coordinate
translation, and Hosts retain visual composition and policy values.

`Annotation` keeps a target selector separate from its presentation. Point
targets may use numbered `marker` presentations for instructions or a
serializable `{ type: "reaction", reaction: "like" | "dislike" }` presentation
for comment-free feedback. Both use the same create, move, delete, and history
contracts exposed by `createAnnotationEditor`.

## Editing grammar evidence (Draft)

The [editing grammar design](../../standards/editing-grammar.md) separates shared
rules from each Hand's interpretation. The [test-only runner](tests/conformance/editing-grammar.ts)
executes the same selection, copy, edit, cut, paste, rejection, no-op, and local
undo/redo observations through public APIs. Its [Document and Sheet bindings](tests/conformance/editing-grammar.test.ts)
keep their own types and expected values; Rich Text binds it from its own package.
These are applicability checks across different profiles, not independent
implementations of one frozen profile.

| Profile decision | Document binding | Sheet binding |
| --- | --- | --- |
| Target and identity | Stable block ID plus text offset; `selection.move` moves content | Stable row/column IDs; cell values |
| Selection | Directional block ranges; Copy includes whole blocks even with text offsets | Rectangular ranges; Copy/Cut use the primary rectangle |
| Topology | Document block order | Document axes by default; supplied visible axes for topology-aware operations |
| Supported operations | Select, insert, remove, move, duplicate, Copy/Cut/Paste, Undo/Redo | Select, commit/fill cells, Copy/Cut/Paste, Undo/Redo; Cut clears values to `null` |
| Paste and resulting selection | Insert after the last selected block by default (or `afterId`); fresh IDs; one collapsed range per inserted block, first primary | Start at focus without replacing the old rectangle; select the written rectangle; reject overflow with `paste.out-of-bounds` |
| Local history | Consecutive text changes in the same block can share a group; selection ends the active group | Consecutive commits to the same cell can share a group; selection ends the active group |
| Input | Headless calls; Web/Affordance choose physical bindings and native text arbitration | Headless calls; Web/Affordance choose physical bindings and native text arbitration |

Both bindings clear local history on external value changes and reconcile missing
selection endpoints. An injected `EditingHistory` retains its own step and
restoration policy. A missing command (the current Database binding has no
`cut`) is distinct from a supported command that is unavailable for the current
selection. The existing [clipboard surface test](tests/clipboard-surface.test.ts)
records that distinction; it does not decide every future Database profile.

Existing public API references and live Usage remain in
[Editing](https://developer-1px.github.io/json-document/docs/api/editing),
[Document](https://developer-1px.github.io/json-document/demo), and
[Sheet](https://developer-1px.github.io/json-document/demo/sheet).

## Document offset selection

For `selection.set`, replace/collapse and extend compare the complete
`DocumentPoint` (`blockId` and `offset`). Moving within one block updates the
caret; extension preserves the primary anchor and changes its focus, including
backward ranges. Offsets are clamped to the block's text bounds.

`mode: "toggle"` continues to address the whole block independently of its text
offsets. Copy still projects whole selected blocks. Selection-only movement
preserves document values and existing Undo/Redo records; Undo after an edit
restores the recorded offset range. These contracts are exercised by
[Document editor tests](tests/document-editor.test.ts) and the existing
[Document Usage](https://developer-1px.github.io/json-document/demo).


Annotation selection preserves its public `{ kind: "annotation", ids, primaryId }`
shape and the order in which IDs were selected. Membership and primary fallback
are owned by Key Selection; document reconciliation retains surviving IDs in
that order. Undo/Redo restores both the document and the associated selection.
`transformAnnotationSelector`, `annotationSelectorBounds`, and
`annotationResizeHandle` are the canonical geometry APIs for preview and commit.
