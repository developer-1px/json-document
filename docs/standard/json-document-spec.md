# json-document 표준 명세

상태: 살아 있는 명세. 현재 코드 동작이 정본이며, 코드, 문서, 테스트가 충돌하면 코드 동작을 확인하고 문서를 갱신한다.

## 0. 정체성

json-document는 Zod schema로 보호되는 headless JSON 편집 엔진이다. 공개 interface는 JSON 표준 어휘와 편집 도구 어휘를 다음 축으로 나눈다.

```txt
document
|-- patch(patch)
|-- duplicate(pointer, options)
|-- at(pointer)
|-- query(jsonPath)
|-- selection
|-- clipboard
|-- history
`-- can*
```

UI rendering, DOM event mapping, visual selection drawing, system clipboard access, drag and drop, keyboard shortcut policy는 라이브러리 본체가 아니다.

## 1. 규범 참조

| 표준 | 역할 |
| --- | --- |
| RFC 8259 / ECMA-404 JSON | state, payload, metadata 직렬화 |
| RFC 6901 JSON Pointer | 정확한 document 주소 |
| RFC 6902 JSON Patch | 변경 형식 |
| RFC 9535 JSONPath | 검색 형식 |
| W3C Selection vocabulary | anchor, focus, range, caret naming |
| Zod 4 | schema validation |
| React >=18 | optional `@interactive-os/json-document/react` hook entrypoint |

규칙:

- Patch path는 JSON Pointer다.
- Query input은 JSONPath다.
- Query output은 Pointer다.
- JSONPath는 patch target이 아니다.
- State, patch operation, selection snapshot, clipboard payload, history metadata는 JSON-serializable이어야 한다.
- Published State와 applied patch record는 immutable snapshot이어야 하며 retained caller reference나 subscriber가 이를 바꿀 수 없어야 한다.

## 2. 공개 Entry Point

패키지 consumer는 `@interactive-os/json-document`와 `@interactive-os/json-document/react`만 import한다. 공개 export 계약의 SSOT는 `packages/json-document/public-contract.json`이다.

Root 진입점:

```ts
import {
  JSONDocumentError,
  PointerSyntaxError,
  appendSegment,
  applyOperation,
  applyPatch,
  applyPatchToTrustedState,
  buildPointer,
  createJSONDocument,
  escapeSegment,
  lastSegment,
  lastSegmentIndex,
  parentPointer,
  parsePointer,
  resolveSiblingRange,
  trackPointer,
  tryParsePointer,
  unescapeSegment,
  withLastSegment,
  type HistoryTransactionOptions,
  type JSONCapabilityResult,
  type JSONChangeMetadata,
  type JSONDocument,
  type JSONDocumentCommitOptions,
  type JSONDocumentDuplicateError,
  type JSONDocumentDuplicateOptions,
  type JSONDocumentDuplicateResult,
  type JSONDocumentEditError,
  type JSONDocumentEditResult,
  type JSONDocumentHistory,
  type JSONDocumentInsertOptions,
  type JSONDocumentInsertTarget,
  type JSONDocumentMoveTarget,
  type JSONDocumentOptions,
  type JSONDocumentPasteOptions,
  type JSONDocumentPasteTarget,
  type JSONPatchInput,
  type JSONPatchOperation,
  type SelectionPoint,
  type JSONResult,
  type Pointer,
  type ClipboardCopyOptions,
  type ClipboardCopyError,
  type ClipboardCopyOk,
  type ClipboardCopyResult,
  type ClipboardCutError,
  type ClipboardCutOk,
  type ClipboardCutOptions,
  type ClipboardCutResult,
  type ClipboardEmpty,
  type ClipboardMutationOk,
  type ClipboardPasteDiscriminatorMismatch,
  type ClipboardPasteError,
  type ClipboardPasteResult,
  type ClipboardReadOk,
  type ClipboardReadOptions,
  type ClipboardReadResult,
  type ClipboardState,
  type ClipboardWriteOptions,
  type EntriesResult,
  type EntryKind,
  type QueryResult,
  type ReadEntry,
  type ReadResult,
  type ResolveSiblingRangeOptions,
  type SiblingLocation,
  type SiblingRangeErrorCode,
  type SiblingRangeResult,
  type SchemaDescription,
  type SchemaDescriptionResult,
  type SchemaErrorCode,
  type SchemaErrorResult,
  type SchemaKind,
  type SchemaKindResult,
  type SchemaPathMode,
  type SchemaQueryResult,
  type SchemaState,
  type SelectionOptions,
  type SelectionPointObject,
  type SelectionOrderedRange,
  type SelectionOrderedRangeEntry,
  type SelectionAffinity,
  type SelectionContext,
  type SelectionCursorDirection,
  type SelectionCursorErrorCode,
  type SelectionCursorOptions,
  type SelectionCursorResult,
  type SelectionCursorTarget,
  type SelectionDirection,
  type SelectionEdge,
  type SelectionMode,
  type SelectionOrderErrorCode,
  type SelectionOrderOptions,
  type SelectionPointOrderResult,
  type SelectionPointerSpan,
  type SelectionPointerSpansResult,
  type SelectionRange,
  type SelectionRangeInput,
  type SelectionRangeOrderResult,
  type SelectionRangesOrderResult,
  type SelectionScopeErrorCode,
  type SelectionScopeOptions,
  type SelectionScopeResult,
  type SelectionScopeTarget,
  type SelectionSnap,
  type SelectionSource,
  type SelectionSpanOptions,
  type SelectionState,
  type SelectionType,
  type DeleteSelectionTextResult,
  type ReplaceSelectionTextResult,
  type SelectionTextDeleteDirection,
  type SelectionTextDeleteOptions,
  type SelectionTextEdit,
  type SelectionTextEditErrorCode,
  type SelectionTextEditOptions,
  type SelectionTextEditsResult,
  type ClipboardSource,
} from "@interactive-os/json-document";
```

React 진입점:

```ts
import { useJSONDocument } from "@interactive-os/json-document/react";
```

`createJSONDocument`와 `useJSONDocument`는 같은 `JSONDocument<T>` 표면을 제공한다.

## 3. JSONDocument 표면

```ts
interface JSONDocument<T> {
  readonly value: T;
  readonly lastPatch: readonly JSONPatchOperation[];
  readonly selection: SelectionState | undefined;
  readonly clipboard: ClipboardState<T>;
  readonly history: JSONDocumentHistory;
  readonly schema: SchemaState;

  patch(operations: JSONPatchInput, metadata?: JSONChangeMetadata): JSONResult;
  commit(operations: readonly JSONPatchOperation[], options?: JSONDocumentCommitOptions): JSONResult;
  find(jsonPath: string): QueryResult;
  insert(target: JSONDocumentInsertTarget, value: unknown, options?: JSONDocumentInsertOptions): JSONResult | Extract<JSONCapabilityResult, { ok: false }>;
  insert(value: unknown): JSONResult | Extract<JSONCapabilityResult, { ok: false }>;
  replace(path: Pointer, value: unknown): JSONResult | Extract<JSONCapabilityResult, { ok: false }>;
  replace(value: unknown): JSONResult | Extract<JSONCapabilityResult, { ok: false }>;
  delete(source?: SelectionSource): JSONResult | Extract<JSONCapabilityResult, { ok: false }>;
  move(source: Pointer, target: JSONDocumentMoveTarget): JSONResult | Extract<JSONCapabilityResult, { ok: false }>;
  move(target: JSONDocumentMoveTarget): JSONResult | Extract<JSONCapabilityResult, { ok: false }>;
  duplicate(source: Pointer, options?: JSONDocumentDuplicateOptions): JSONDocumentDuplicateResult<T>;
  duplicate(options?: JSONDocumentDuplicateOptions): JSONDocumentDuplicateResult<T>;
  copy(source?: SelectionSource, options?: ClipboardCopyOptions): ClipboardCopyResult;
  cut(source?: SelectionSource, options?: ClipboardCutOptions): ClipboardCutResult<T>;
  paste(target?: JSONDocumentPasteTarget, options?: JSONDocumentPasteOptions): ClipboardPasteResult<T>;
  undo(): JSONCapabilityResult;
  redo(): JSONCapabilityResult;
  load(value: unknown, options?: { preserveHistory?: boolean }): JSONResult;
  reset(value?: unknown): JSONResult;
  subscribe(listener: (applied: readonly JSONPatchOperation[], metadata?: JSONChangeMetadata) => void): () => void;

  at(path: Pointer): ReadResult;
  exists(path: Pointer): boolean;
  query(jsonPath: string): QueryResult;
  entries(path: Pointer): EntriesResult;

  canPatch(operations: JSONPatchInput): JSONCapabilityResult;
  canFind(jsonPath: string): JSONCapabilityResult;
  canInsert(value: unknown): JSONCapabilityResult;
  canInsert(target: JSONDocumentInsertTarget, value: unknown, options?: JSONDocumentInsertOptions): JSONCapabilityResult;
  canReplace(value: unknown): JSONCapabilityResult;
  canReplace(path: Pointer, value: unknown): JSONCapabilityResult;
  canDelete(source?: SelectionSource): JSONCapabilityResult;
  canMove(target: JSONDocumentMoveTarget): JSONCapabilityResult;
  canMove(source: Pointer, target: JSONDocumentMoveTarget): JSONCapabilityResult;
  canDuplicate(source: Pointer, options?: JSONDocumentDuplicateOptions): JSONCapabilityResult;
  canDuplicate(options?: JSONDocumentDuplicateOptions): JSONCapabilityResult;
  canCopy(source?: SelectionSource): JSONCapabilityResult;
  canCut(source?: SelectionSource): JSONCapabilityResult;
  canPaste(target?: JSONDocumentPasteTarget, options?: JSONDocumentPasteOptions): JSONCapabilityResult;
  canUndo(): JSONCapabilityResult;
  canRedo(): JSONCapabilityResult;
}
```

`can*`는 boolean이 아니라 이유 있는 결과를 반환한다.

`strict`는 `patch`, `commit`, `load`, `reset`에만 적용된다. 처리된 execution failure는 `JSONDocumentError`를 만들고, `onError`는 throw나 return보다 먼저 실행된다. `strict: true`는 throw하고 기본 non-strict mode는 실패한 `JSONResult`를 반환한다. `can*`, read, schema, selection, clipboard, duplicate, history API는 각자의 Result, boolean, snapshot 표면을 유지한다.

기본값은 `strict: false`다. 실행 실패를 throw로 받고 싶은 caller만
`strict: true`를 명시한다. Invalid initial value는 document 생성 전에 Zod parse
error를 throw한다.

## 4. 변경

편집 feature verb는 document의 primary mutation surface다. `patch`는 RFC 6902 escape hatch이며 operation 하나 또는 배열을 받는다.

```ts
doc.insert("/items/-", item);
doc.replace("/title", "Ready");
doc.delete("/items/0");
doc.move("/items/0", "/items/2");
doc.move("/items/0", { after: "/items/2" });
doc.copy("/items/0");
doc.cut("/items/1");
doc.paste("/items/-");
doc.undo();
doc.redo();
doc.patch({ op: "replace", path: "/title", value: "Ready" });
doc.patch([
  { op: "add", path: "/items/-", value: item },
  { op: "replace", path: "/meta/owner", value: "core" },
]);
```

`commit`은 patch operation 배열과 metadata, explicit final selection을 하나의 history entry로 기록할 수 있다.

```ts
const planned = doc.selection?.textPatch("A");
if (planned?.ok) {
  doc.commit(planned.patch, {
    label: "typing",
    origin: "keyboard",
    mergeKey: "title",
    selectionAfter: planned.selection,
  });
}
```

`duplicate(pointer, options)`는 공개 high-level sibling duplication verb다. source를 생략하면 현재 primary selection을 사용한다. 배열은 source 뒤에 삽입하고, object member는 `newKey`를 요구할 수 있으며, `rekey`는 id-like field 충돌을 피한다.

`duplicate`는 즉시 적용된다. 성공 결과의 `value`는 현재 document value이고 `applied`는 이미 적용된 patch record다. `applied`를 다시 `commit`하면 안 된다.

`load`는 schema-valid value로 document를 교체한다. `reset`은 초기값 또는 제공값으로 복원한다. `subscribe`는 적용된 patch record와 serializable metadata를 관찰한다.

## 5. 읽기와 검색

읽기는 document를 변경하지 않는다.

```ts
doc.at("/items/0/name");
doc.exists("/items/0");
doc.entries("/items");
doc.find("$.items[*].id");
doc.query("$.items[*].id");
```

JSONPath는 검색 언어다. `find`는 편집 feature verb이고, `query`는 같은 JSONPath engine을 노출하는 lower-level read primitive다. Mutation input은 JSON Pointer `path`와 `from`을 가진 JSON Patch operation으로 유지한다.
RFC 6902 `path`와 `from`은 URI fragment가 아니라 JSON Pointer의 JSON string 표현인 `""` 또는 `/...`를 사용한다. URL이나 `$ref`에서 받은 `#`/`#/...`는 adapter가 parse한 뒤 canonical string 표현으로 변환한다.

```ts
const found = doc.find("$.items[?(@.done==false)]");
if (found.ok) {
  doc.patch(found.pointers.map((path) => ({ op: "replace", path: `${path}/done`, value: true })));
}
```

## 6. 선택

Selection은 command namespace가 아니라 JSON-safe state다. “무엇이 선택되었는가”를 답하고 selection planning helper를 제공한다.

핵심 vocabulary:

- `anchor`
- `focus`
- `selectionRanges`
- `selectedPointers`
- `primaryIndex`
- collapsed range로서의 `caret`

```ts
doc.selection?.collapse("/items/0");
doc.selection?.selectRanges(["/items/0", "/items/1"]);
doc.selection?.moveCursor("next", { points });
doc.selection?.extendCursor("next", { points });
doc.selection?.textPatch("replacement");
doc.selection?.deleteText();
doc.selection?.snapshot();
doc.selection?.restore(snapshot);
```

Document patch는 가능한 경우 selection pointer를 추적한다. 사라진 selection은 nearby sibling 또는 parent position으로 회복하거나 제거된다.

## 7. 클립보드

Clipboard는 JSON payload flow를 소유한다. Headless buffer이며 `navigator.clipboard`를 호출하지 않는다.

```ts
doc.copy("/items/0");
doc.cut(["/items/0", "/items/1"]);
doc.paste("/items/-");
doc.paste({ into: "/items" });
doc.paste({ after: "/items/0" });
doc.insert("/items/-", { id: "new", name: "New" });
doc.insert({ into: "/items" }, { id: "new", name: "New" });
doc.insert({ after: "/items/0" }, { id: "new", name: "New" });
doc.move("/items/0", { into: "/archive" });
doc.clipboard.write(payload, { trustedPayload: true });
doc.clipboard.clear();
```

Top-level `copy`, `cut`, `paste`는 보편 clipboard feature verb다. `paste`는 document clipboard buffer를 읽는다. 외부 payload, snippet, drag/drop payload처럼 값 자체를 넣는 경우에는 `insert(target, value, options?)`를 사용한다. `doc.clipboard`는 payload buffer state와 lower-level clipboard boundary를 유지한다. `copy`와 `cut`은 source를 생략하면 현재 selection source를 사용한다. `paste`와 `insert(value)`는 target을 생략하면 current primary selection pointer를 사용한다.

`write(..., { trustedPayload: true })`는 호출자가 JSON-serializability boundary를 이미 소유할 때 payload JSON 검사를 건너뛴다. 기본적으로 payload는 buffer에 저장되기 전에 clone된다.

`cut`, `paste`는 즉시 적용된다. 성공 결과의 `value`는 현재 document value이고 `applied`는 이미 적용된 patch record다.

삽입/이동 위치가 이미 있으면 `/items/-` 같은 exact Pointer를 그대로 쓴다. Array container 안에 append할 때는 `{ into: "/items" }`를 쓴다. Array item 기준 sibling 배치는 `{ before: "/items/0" }`, `{ after: "/items/0" }`를 쓴다. Object member 추가는 순서가 없으므로 `/record/key` 같은 exact Pointer를 쓴다. Clipboard paste는 추가로 `{ replace: pointer }`를 지원한다. `move`의 relative target은 같은 array 안에서 source removal 때문에 target index가 밀리는 경우 core가 JSON Patch destination을 보정한다.

Multi-source copy/cut은 array payload를 저장한다. 이 buffer를 array insertion target에 paste하면 기본적으로 spread된다. `{ spread: false }`는 array payload 자체를 하나의 값으로 넣을 때만 쓴다. 직접 array payload를 `insert(target, payload, { spread: true })`로 넣으면 item별 sibling insert가 된다.

`discriminator_mismatch`는 schema violation이 아니며 `violations`를 노출하지 않는다. Capability check는 `code`와 `reason`으로 보고하고, clipboard paste mutation result는 `ClipboardPasteDiscriminatorMismatch` 형태의 `source`와 `expected`를 포함할 수 있다.

## 8. 히스토리

History는 forward patch와 inverse patch, selection metadata를 저장한다.

```ts
doc.undo();
doc.redo();
doc.history.mergeLast({ mergeKey: "typing:title" });
doc.commit([
  { op: "replace", path: "/items/0/name", value: "A" },
  { op: "replace", path: "/items/1/name", value: "B" },
], { label: "rename" });
```

알려진 burst edit은 하나의 operation array로 commit한다. `history.transaction`은 중간 document state를 관찰해야 하는 workflow에서 history entry를 묶지만, 반복 `doc.patch(...)` 호출을 한 번의 schema validation으로 바꾸지는 않는다.

`history.canUndo`와 `history.canRedo`는 UI disabled state를 위한 boolean이다. `canUndo()`와 `canRedo()`는 이유 있는 capability result를 반환한다.

History metadata는 앱이나 adapter가 document change에 붙이는 주석이다. 공개 history API는 undo/redo control surface이지 history entry inspector가 아니다. 저장, audit log, command label, collaboration adapter는 `doc.subscribe((patch, metadata) => ...)`로 패치 스트림을 mirror한다.

앱이 `"Undo Rename card"` 같은 label을 필요로 하면 command/action layer에서 `commit`이나 `history.transaction`에 넘긴 metadata를 보관한다. `mergeKey`는 app annotation이면서 history grouping hint다.

## 9. 성능

큰 문서의 hot path는 document facade인 `doc.patch`, `doc.commit`, `doc.canPatch`에 둔다. 공개 `applyPatch`는 외부 JSON 경계라서 입력 state 전체의 JSON 안전성을 확인한다. `applyPatchToTrustedState`는 호출자가 이미 state JSON 경계를 소유할 때 쓰는 pure core opt-in이다. Operation value와 schema validation은 여전히 실행되며 구조만 가진 schema는 document facade와 같은 trusted fast path를 사용할 수 있다.

Document facade는 accepted payload를 ingress에서 소유한다. 아직 immutable provenance가
없는 COW state는 `value`, read result, EditOk처럼 외부로 처음 노출될 때 container graph를
한 번 freeze한다. 이미 publish되었거나 신뢰된 immutable base의 단일 mutation 및
replace-only batch는 변경 경로의 COW container만 seal한다. 구조가 이동하는 batch는
immutable base와의 identity diff로 상속 subtree를 건너뛰고 새 container만 freeze한다.
같은 snapshot의 반복 읽기는 ownership cache를 재사용한다. 따라서 input/commit hot path와 render/read
snapshot materialization 비용을 각각 측정할 수 있다. `trustedInitial: true`의 mutable
value는 clone fallback을 사용하며, pre-frozen root는 caller의 transitive immutability
assertion으로 같은 identity를 재사용할 수 있다. Schema output이 정적으로 JSON임을
판별할 수 있을 때만 JSON scan도 생략되어 O(1) 생성이 된다. Custom/refined schema는
frozen root도 JSON boundary를 한 번 검사한다. 이 경로에서 caller는 schema-valid JSON
output도 함께 보증한다. Pure
`applyPatch*` helper는 state owner가 아니므로 이 runtime ownership 정책의
대상이 아니다.

빠른 document path는 신뢰된 document state와 구조를 정적으로 해석할 수 있는 Zod schema에 적용된다. Check가 없는 object, array, record, scalar validator는 기존 non-root `replace` batch(독립 경로와 순차 ancestor/descendant overlap 포함), array `add`/`remove`/`copy`/`move`, same-array `add`/`remove` batch를 지원한다. Zod의 선언적 string/number constraint와 built-in `trim()`이 primitive leaf에만 있는 schema는 non-root 단일/독립 `replace` batch만 위치별로 검증한다. Leading `test` assertion 뒤에 이 edit들이 오는 guarded batch도 assertion을 먼저 확인한 뒤 같은 mutation fast path를 사용한다. Overlapping `replace`의 history inverse도 operation별 이전 값과 역순을 유지하면서 같은 private copy-on-write 순회 구현을 사용한다.

`refine`, `superRefine`, custom check/overwrite, custom error callback, container check, coercion, pipe transform은 의도적으로 전체 루트 schema 검증으로 돌아간다. 전체 루트 검증은 Zod check와 schema/global error callback이 실패한 input까지 관찰할 수 있으므로 candidate를 전체 JSON clone한 뒤 수행한다. 지원되는 위치별 `replace` 검증도 object payload만 먼저 clone해 caller-owned input과 live state를 격리한다.

Adapter readiness benchmark의 hard gate는 process CPU-time p95다. 이는 json-document process의 계산과 GC CPU는 포함하고 다른 process 때문에 deschedule된 시간은 제외한다. 같은 run의 wall-time p50/p95/max는 진단값이며, 사용자 체감 wall latency는 Canvas/Editable 전용 또는 idle runner에서 별도로 확인한다.

```sh
npm run perf:adapters
npm run perf:core
```

## 10. Schema

모든 mutation은 제공된 Zod schema로 검증된다. 실패한 mutation은 atomic하다. State, selection, clipboard, history가 부분적으로 바뀌면 안 된다.

```ts
doc.schema.kind("/items/-", "insert");
doc.schema.at("/items/-", "insert");
doc.schema.describe("/items/-", "insert");
doc.schema.accepts("/items/-", candidate, "insert");
```

`violations`가 있는 validation result에서 각 `violation.path`는 RFC 6901 JSON Pointer다. `doc.schema.accepts(path, value, mode)`는 요청한 `path`에 Zod issue path를 붙인 `schema-slot` path를 보고한다. `canPatch`, `canPaste`, `doc.paste`, `canDuplicate`, `duplicate`는 먼저 JSON Patch operation을 plan 또는 preview한 뒤 `document-result` path를 보고한다.

Root validation issue는 empty JSON Pointer `""`를 사용한다. Record value는 `/meta/newKey` 같은 concrete member pointer로 검증한다. `insert` mode는 주로 array insertion slot용이다.

## 11. 공개 계약

패키지 consumer가 의존할 수 있는 표면은 root `@interactive-os/json-document` entrypoint와 `@interactive-os/json-document/react` entrypoint다. Private source structure는 external contract가 아니다.

공개 export 계약 SSOT는 `packages/json-document/public-contract.json`이다. Semver 판단은 이 파일의 export 목록, `JSONDocument` surface, Result shape, error code, atomicity, clipboard spread 기본 동작, strict 의미론을 기준으로 한다.

다른 구현체나 adapter는 public package entrypoint와 이 문서의 의미론만 기준으로 삼아야 한다. 구현 파일 경로나 internal module import를 요구하면 json-document 호환 surface가 아니다.
