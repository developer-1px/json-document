# @interactive-os/json-document-calendar

React lifecycle for Calendar Hands over the canonical interval editor. The
package owns editor subscription, occurrence focus, normalized gesture preview,
canonical Rename composition, and series-scope command binding. The Editing package owns
Calendar document and intent semantics, Affordance owns the input-independent
gesture lifecycle, and Web owns Pointer Events capture and coordinate
translation. Hosts keep fixtures, URL state, product copy, layout, colors, and
time-grid policy.

```tsx
const editor = createCalendarEditor(document);
const calendar = useCalendarHand(editor);

calendar.dispatch({ type: "selection.set", eventIds: [eventId] });
calendar.applySelectedPatch({ title: "Planning" });
const titleInput = useCalendarRenameInput(calendar);
```
