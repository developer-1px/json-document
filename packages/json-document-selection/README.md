# @interactive-os/json-document-selection

DOM-free selection families and semantic interaction controllers for structural editors.

## Responsibility boundary

The package owns JSON-safe selection state, pure family transitions, reconciliation/mapping, target publication, and pointer/keyboard interaction lifecycles after physical input has been translated into semantic operations.

플랫폼 geometry 관찰·hit testing·modifier 해석·DOM focus·native caret/IME는
Adapter와 해당 UI owner가, delete·move·fill·paste의 의미는 문서·Editing owner가
소유합니다. Host는 제품 정책 값과 구체 인스턴스·layout을 조합하며 이 책임을
직접 재구현하지 않습니다.

```text
platform adapter ─┐
domain facade ─────┼─> selection family → reconcile/map → targets
editing history ──┘
```

## Families

- `KeySelection`: explicit keys or symbolic `all` with exclusions and a host-issued universe token.
- `RangeSelection`: directional anchor/focus ranges over a host-provided `OrderedTopology`.
- `MaterializedRangeSelection`: directional ranges whose resolved points survive virtualized or paged topology changes. Each range keeps its anchor/focus and the points produced by the topology at transition time; reconciliation removes only identities that the topology no longer recognizes.
- `MaskSelection`: an extension protocol whose weighted representation and algebra belong to the implementing document/editor owner, not anonymous Host logic.

These families share `SelectionFamily`; they do not share a universal reducer.

Use `createMaterializedRangeSelectionFamily` when the visible topology can change while logical selection must remain stable. Supply `reconcilePoint` for the full identity universe and `interval` for the currently visible order. `targets()` then publishes the stored points instead of reinterpreting old endpoints through a new view.

## Platform adapters

Translate physical input before calling the package:

```ts
import { selectionOperationFromModifiers } from "@interactive-os/json-document-web";

const operation = selectionOperationFromModifiers(event);
```

Viewport-to-domain coordinate conversion, pointer capture, auto-scroll, and accessibility remain in the adapter. Pass only `PointerSample<Point>` values to `reducePressInteraction` or `reduceMarqueeInteraction`.

## Editing and history

Domain facades translate `{ selection, intent }` into forward/inverse patches plus `selectionAfter`. A document mutation history entry stores `selectionBefore` and `selectionAfter`; selection-only movement does not create a document history entry. Native text selection is represented only by an edit lease in `SelectionSession` and stays owned by the input/editor.

## Select All semantics (Draft grammar)

`KeySelectionCommand`'s `select-all` selects the specified universe. Repeating
that intent in the same universe preserves the selection; issuing it after
subtracting targets restores those targets. It does not toggle the universe off.
[EG-SELECT conformance](tests/conformance/select-all.test.ts) checks empty,
single-target, ordered multi-target, and excluded-target cases.
An input profile may translate a second Mod+A into a separate `clear` command,
as `selectAllAffordance` does. Navigation, selected targets, and a native text
caret remain separate responsibilities.
