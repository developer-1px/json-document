# @interactive-os/json-document-selection

DOM-free selection families and semantic interaction controllers for structural editors.

## Responsibility boundary

The package owns JSON-safe selection state, pure family transitions, reconciliation/mapping, target publication, and pointer/keyboard interaction lifecycles after physical input has been translated into semantic operations.

The host owns DOM or canvas geometry, hit testing implementation, modifier-key mapping, focus and accessibility wiring, native text caret/IME state, and domain edits such as delete, move, fill, and paste.

```text
platform adapter ─┐
domain facade ─────┼─> selection family → reconcile/map → targets
editing history ──┘
```

## Families

- `KeySelection`: explicit keys or symbolic `all` with exclusions and a host-issued universe token.
- `RangeSelection`: directional anchor/focus ranges over a host-provided `OrderedTopology`.
- `MaskSelection`: an extension protocol whose weighted representation and algebra remain host-owned.

These families share `SelectionFamily`; they do not share a universal reducer.

## Platform adapters

Translate physical input before calling the package:

```ts
const operation: SelectionOperation = event.shiftKey
  ? "extend"
  : event.metaKey || event.ctrlKey
    ? "toggle"
    : "replace";
```

Viewport-to-domain coordinate conversion, pointer capture, auto-scroll, and accessibility remain in the adapter. Pass only `PointerSample<Point>` values to `reducePressInteraction` or `reduceMarqueeInteraction`.

## Editing and history

Domain facades translate `{ selection, intent }` into forward/inverse patches plus `selectionAfter`. A document mutation history entry stores `selectionBefore` and `selectionAfter`; selection-only movement does not create a document history entry. Native text selection is represented only by an edit lease in `SelectionSession` and stays owned by the input/editor.
