# UI Builder control adapters

`UIComponentSurface` adapts registered JSON content to public UI Primitives,
Calendar, and Animation React components. Input values travel through
`UIComponentInteraction.onValueChange`; calendar viewport and range properties
travel through `onPropsChange`. Page links dispatch `onNavigate(targetPageId)`
separately from commands dispatching `onAction(actionId)`.

## Mapping content to controls

| User task | Component | Content contract |
| --- | --- | --- |
| Enter short or long text | `input`, `textarea` | `value`, placeholder in `detail` |
| Find records | `search` | query in `value`; runtime connects target table |
| Agree or mark complete | `checkbox` | boolean `value` |
| Choose one value | `select` | labels in `items`, selected label in `value`; `props.presentation` popup or inline |
| Switch views | `tabs` | labels in `items`, selected label in `value` |
| Change numeric value | `value-input` | number `value`, `props.min/max/step`, continuous or stepped presentation |
| Change binary setting | `toggle` | boolean `value`, button or chip presentation |
| Reveal supporting content | `disclosure` | `props.expanded`, content in `detail` |
| Move to another page | `page-link` | `targetPageId` |
| Enter calendar value | date/time/datetime/month/week `*-field` | native date string in `value` |
| Choose date | `date-picker`, `calendar-grid`, `date-grid` | date string in `value`; grid viewport in `props.visibleDate` |
| Choose interval | `date-range-picker`, `range-calendar` | ISO dates in `props.start/end` |

Calendar grid `props.grain` is `week`, `month`, or `year`. Date inputs preserve
the canonical validation and commit on blur or Enter. Range edits use the
Calendar API's ordered interval contract and persist both endpoints together.

Explicit empty select values remain unselected; only an omitted value uses the
first option default. Empty date-picker values remain empty. `props.visibleDate`
sets the calendar's initial viewport without manufacturing a stored date.

## Animation feedback

All 31 visual exports from `@interactive-os/json-document-animation-react` map
to their kebab-case registration names. Their public options are preserved:
`shimmer-text` tone, `skeleton` shape, `stagger-lines` line count, `wave-dots`
frame, and status `announce`/label. Decorative exports remain decorative.
`progress-ring` and `loading-bar` are indeterminate visuals: these public APIs
do not accept completion values and must not imply a measured percentage.

Source: [controls](../src/ui-component-controls.tsx),
[feedback](../src/ui-component-feedback.tsx).

Choice groups keep their group name separate from option names. The adapter uses a non-label field wrapper: wrapping multiple radio buttons in one HTML label would rename the first option and make label clicks choose that option. Individual option labels remain the serialized `items` values.
