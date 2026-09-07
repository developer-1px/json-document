# @interactive-os/json-document-editing

`EditingSession` observes snapshots by JSON value, not reference identity.
Fresh-copy JSONDocument implementations retain local history until an actual
external value change. Undo reverses each operation against its sequential
pre-state, including object `add` replacement and array index shifts. A
`historyGroup` composes all grouped inverse operations, including different paths.

Snapshots and their selections are immutable owned values. Subscriber failures
do not reject completed edits; reentrant notifications are delivered in revision
order. A returned result describes its own transition, even if a subscriber has
already performed another transition.

Domains can provide `mapSelection(selection, { before, after, change })` and
`reconcileSelection(selection, value)` to `createEditingSession`. Both are pure
callbacks and run before publication of an external value change, mapping first.
`change` is the matching applied change, or `null` when a lazy read or reentrant
write must catch up from snapshots alone. Mapping must support that case.
Reconciliation repairs validity without claiming to preserve logical positions.
All nine built-in editors reconcile external deletion using their own selection
families; Calendar retains valid off-screen occurrences. Rich Text maps stable
text IDs through external text replacement, including affinity and scalar boundaries.

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

`createEditingId(prefix)` supplies opaque UUID-based identities for Document,
Order, Object, Tree, Calendar and Rich Text. IDs do not restart per editor or
replica. Custom `createId` injection remains supported; its provider must ensure
uniqueness across all writers. Environments without `crypto.randomUUID` fail
explicitly with `editing.id-provider-unavailable`; no weak random fallback is used.

The session subscribes to its document only while it has observers. The last
unsubscribe releases that connection; later reads catch up with external state.
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
  Their host or domain slice supplies ordered axes, visible order, and JSON
  Patch planning.
- `Object` uses the key family. The host owns pointer
  geometry and hit-testing, then sends only stable object IDs to the editor.
  Its public `selection.set` accepts the shared `replace`, `extend`, and
  `toggle` vocabulary directly; `extend` has key-family union semantics.

All slices keep renderer, DOM, physical keyboard policy, geometry, and expansion
state outside the common engines. Value-changing transactions store forward and
inverse patches with `selectionBefore` and `selectionAfter`; selection-only,
no-op, canceled, preview, and remote-presence changes do not create local document
history. Native text selection remains input/editor-owned and connects through
an explicit edit lease rather than becoming a structural selection variant.

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
span. Pixel grids and view chrome stay in the Host.

`Annotation` keeps a target selector separate from its presentation. Point
targets may use numbered `marker` presentations for instructions or a
serializable `{ type: "reaction", reaction: "like" | "dislike" }` presentation
for comment-free feedback. Both use the same create, move, delete, and history
contracts exposed by `createAnnotationEditor`.
