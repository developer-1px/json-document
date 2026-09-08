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

`createEditingId(prefix)` supplies opaque UUID-based identities for Document,
Order, Object, Tree, Calendar and Rich Text. IDs do not restart per editor or
replica. Custom `createId` injection remains supported; its provider must ensure
uniqueness across all writers. Environments without `crypto.randomUUID` fail
explicitly with `editing.id-provider-unavailable`; no weak random fallback is used.

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
