# @interactive-os/json-document-editing

Headless editing transactions, selection publication, clipboard coordination,
and history for `@interactive-os/json-document`. Structural selection state and
semantic interaction contracts come from `@interactive-os/json-document-selection`.

The package keeps browser rendering and input outside the core. Its first
domain slice is a small block document used by the official site demo.

Every domain editor accepts either an initial JSON value or an existing
`JSONDocument`. Passing an existing instance lets multiple Connectors observe
and commit the same canonical state while each editor keeps its own structural
selection and local history.

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
`createCalendarEditor` creates, moves while keeping duration, resizes start or
end, moves by day, deletes, and undoes on one document across day, week, month,
and year views. `interpretCalendarTimeGridPointer`,
`interpretCalendarAllDayPointer`, and `interpretCalendarMonthPointer` map a
press-release to those intents from the origin event, not the current
selection. `calendarTimedLayout` places a timed event on its `start`/`end`
span. Pixel grids and view chrome stay in the Host.

`Annotation` keeps a target selector separate from its presentation. Point
targets may use numbered `marker` presentations for instructions or a
serializable `{ type: "reaction", reaction: "like" | "dislike" }` presentation
for comment-free feedback. Both use the same create, move, delete, and history
contracts exposed by `createAnnotationEditor`.
