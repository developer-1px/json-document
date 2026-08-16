# JSONDocument Rich Text v1 Profile

표준 상태: Draft. 이 profile은 [#361](https://github.com/developer-1px/json-document/issues/361)의
Official Rich Text Domain을 구현하기 전에 동결해야 하는 normative 계약이다.
Draft reference implementation은 official Domain/Web/React packages와 Rich Text Lab에서
검증한다. 구현이 존재하더라도 이 문서, `schema.json`, machine-readable conformance
vector 순서가 구현의 우연한 동작보다 우선한다.

`MUST`, `MUST NOT`, `SHOULD`, `MAY`는 RFC 2119의 의미로 사용한다.

## 목적과 경계

Official Rich Text Domain은 JSONDocument의 canonical JSON과 atomic JSON Patch를
rich text에 적용하는 공식 companion domain이다. 완성형 editor나 외부 editor
Connector가 아니다.

```text
@interactive-os/json-document
        ↓
@interactive-os/json-document-selection
        ↓
@interactive-os/json-document-editing
        ↓
@interactive-os/json-document-rich-text
        ↓
Web / React Connector
        ↓
Host product UI
```

Core는 rich-text node, mark, DOM과 제품 command를 알지 않는다. Rich Text Domain은
기존 Selection family, OrderedTopology port, EditingSession, Clipboard/Web
contract를 상태 전이의 실제 소유자로 사용한다.

## 외부 reference와 의도적인 차이

| Reference | 채택 | 의도적으로 다르게 함 |
| --- | --- | --- |
| ProseMirror | typed node tree, schema-declared content, marks, transform 뒤 position mapping, schema-driven rendering | 전역 integer position과 editor-owned state 대신 stable node identity, `RangeSelection`, `EditingSession`, JSON Patch commit 사용 |
| Portable Text | JSON block/inline model, presentation-independent serialization, custom content extension | `_type`/`_key`, block-local `markDefs`, working-draft wire format은 채택하지 않음 |
| Lexical | DOM이 아닌 canonical model, immutable committed state, stable node identity | editor instance가 document와 selection을 함께 소유하지 않고 JSONDocument와 Selection/Editing companion을 조합 |

typed tree와 schema-driven rendering은 de-facto stable direction이다. Exact JSON,
identity와 editor state ownership은 contested이므로 JSONDocument의 기존 계약을
우선한다.

## Parent contract traceability

| #361 contract | 이 profile의 정본 위치 |
| --- | --- |
| Versioned official schema와 canonical JSON | `JDRT1-PROFILE-*`, `NODE-*`, `MARK-*`, `schema.json` |
| Validation과 normalization | `JDRT1-VALIDATION-*`, `NORMALIZATION-*` |
| Stable identity와 position mapping | `JDRT1-IDENTITY-*`, `POSITION-*`, `MAPPING-*` |
| 기존 Selection/Topology 직접 사용 | `JDRT1-SELECTION-*`, `TOPOLOGY-*` |
| 기존 EditingSession/History 직접 사용 | `JDRT1-EDIT-*`, `HISTORY-*` |
| 구조 JSON + HTML + plain Clipboard | `JDRT1-CLIPBOARD-*` |
| Official Renderer와 contenteditable 경계 | `JDRT1-RENDER-*`, `PACKAGE-*` |
| Custom schema와 외부 format 구분 | `JDRT1-EXTENSION-*` |
| Contract/conformance와 browser acceptance | `JDRT1-CONFORMANCE-*`, `conformance/vectors/rich-text.json` |
| Core에 rich-text 의미를 넣지 않음 | `JDRT1-PACKAGE-001`과 package graph |
| 병렬 Selection/History/Clipboard/Topology 금지 | 각 companion section의 one-to-one mapping과 common gap |

이 표에 없는 #361 Done 또는 Don't은 구현 child issue로 투영할 수 없다. 새 의미가
필요하면 profile을 조용히 넓히지 않고 #361 contract delta를 먼저 승인받는다.

## Normative requirements

| ID | 요구사항 |
| --- | --- |
| JDRT1-GOV-001 | 구현은 profile, schema, conformance vector의 의미를 MUST 준수하고 reference implementation의 우연한 동작으로 계약을 변경하면 안 된다. |
| JDRT1-DATA-001 | document, node, mark, attrs, selection, clipboard와 metadata는 RFC 8259 JSON value여야 한다. |
| JDRT1-PROFILE-001 | Official v1 document는 `profile` 값 `urn:interactive-os:json-document:rich-text:1`, root `id`, root `type: "doc"`, 비어 있지 않은 `content`를 MUST 가진다. |
| JDRT1-NODE-001 | 모든 node는 document 범위에서 유일하고 비어 있지 않은 stable `id`와 schema에 등록된 `type`을 MUST 가진다. Mark는 node가 아니며 node ID를 가지지 않는다. |
| JDRT1-NODE-002 | Official v1 node 어휘는 `doc`, `paragraph`, `heading`, `blockquote`, `codeBlock`, `bulletList`, `orderedList`, `listItem`, `text`, `hardBreak`다. |
| JDRT1-NODE-003 | Canonical container는 `content`를 생략하지 않는다. Canonical text node는 비어 있지 않은 `text`와 `marks`를 가진다. Empty text node는 MUST NOT 저장한다. |
| JDRT1-MARK-001 | Official v1 mark 어휘는 `strong`, `emphasis`, `underline`, `strikethrough`, `code`, `link`다. 한 text node에는 같은 mark type이 두 번 올 수 없다. |
| JDRT1-MARK-002 | Canonical mark 순서는 `link`, `strong`, `emphasis`, `underline`, `strikethrough`, `code`다. `code`는 다른 mark와 함께 올 수 없다. |
| JDRT1-VALIDATION-001 | Validation은 candidate를 바꾸지 않고 structural 및 semantic violation을 stable failure code와 node ID 또는 Pointer로 반환해야 한다. |
| JDRT1-NORMALIZATION-001 | Normalization은 validation과 별도 operation이며 새 canonical value와 ordered JSON Patch를 반환해야 한다. 암묵적으로 commit하면 안 된다. |
| JDRT1-NORMALIZATION-002 | Normalization은 empty text 제거, 같은 marks를 가진 인접 text 병합, mark 정렬·중복 제거, 최소 empty paragraph 복원을 deterministic하게 수행해야 한다. |
| JDRT1-IDENTITY-001 | Split은 왼쪽 node가 기존 ID를 유지하고 오른쪽 node가 새 ID를 얻는다. Join은 앞 node가 기존 ID를 유지하고 뒤 node ID를 폐기한다. Move는 ID를 유지한다. |
| JDRT1-IDENTITY-002 | Paste는 slice 안의 모든 node ID를 목적 document에서 유일한 새 ID로 remap해야 하며 slice 내부 참조도 같은 mapping을 사용해야 한다. |
| JDRT1-POSITION-001 | `RichTextPoint`는 text 내부 또는 container child boundary를 node ID와 offset으로 식별하고 boundary insertion을 결정하는 affinity를 MUST 가진다. |
| JDRT1-POSITION-002 | Text offset은 UTF-16 code unit이고 surrogate pair 내부를 가리키면 안 된다. Child offset은 `0..content.length` 범위다. |
| JDRT1-MAPPING-001 | 모든 value-changing Rich Text operation은 전후 point를 변환하는 `RangeSelectionMapping<RichTextPoint>`를 제공해야 한다. 삭제된 point는 affinity 방향의 가장 가까운 유효 boundary로 mapping하고 유효 boundary가 없을 때만 `null`이다. |
| JDRT1-SELECTION-001 | Canonical rich-text selection state는 별도 reducer가 아니라 `RangeSelection<RichTextPoint>` specialization이어야 한다. Selection-only transition은 document patch와 history entry를 만들면 안 된다. |
| JDRT1-TOPOLOGY-001 | Rich Text document order는 `OrderedTopology<RichTextPoint, RichTextTarget>`을 구현해야 하며 DOM order가 아니라 schema의 depth-first logical order를 사용한다. |
| JDRT1-EDIT-001 | Official editor의 value-changing intent는 schema-aware transform을 거쳐 `EditingPlan<RichTextSelection>`과 ordered atomic JSON Patch로 표현되어야 한다. |
| JDRT1-EDIT-002 | Validation 또는 transform 실패는 document value, selection, history와 notification을 바꾸면 안 된다. Expected failure는 stable result code로 반환해야 한다. |
| JDRT1-EDIT-003 | Official v1 intent family는 selection set/remove, text insert/delete, mark toggle, block split/join/set type, node insert/remove/move/set attrs와 clipboard paste를 표현해야 한다. |
| JDRT1-HISTORY-001 | Rich Text Domain은 별도 undo stack을 만들면 안 되며 `EditingSession` history에 operations와 `selectionBefore`/`selectionAfter`를 함께 기록해야 한다. |
| JDRT1-HISTORY-002 | Composition session은 하나의 history group이어야 한다. 외부 change에서 history/selection 보존에 공통 mapping 또는 rebase가 필요하면 Editing contract를 일반화하고 Rich Text 내부에서 우회하면 안 된다. |
| JDRT1-CLIPBOARD-001 | Structured clipboard는 versioned `RichTextSlice`, `text/plain`, `text/html`을 함께 표현해야 한다. Paste 우선순위는 유효한 structured slice, schema-parse 가능한 HTML, plain text 순서다. |
| JDRT1-CLIPBOARD-002 | Copy는 value와 history를 바꾸지 않는다. Cut/paste는 Rich Text intent와 `EditingSession.apply()`를 통해 value와 selection을 원자적으로 바꾼다. |
| JDRT1-EXTENSION-001 | Official schema extension은 새 absolute profile URI와 namespaced node/mark type을 선언하고 official type을 재정의하면 안 된다. |
| JDRT1-EXTENSION-002 | Unavailable profile 또는 extension은 raw JSON을 손실시키면 안 된다. Validation/editing은 stable failure를 반환하고 renderer는 host fallback으로 raw node를 전달해야 한다. |
| JDRT1-RENDER-001 | Official rendering은 canonical schema의 projection이다. 같은 schema와 registry를 쓰는 read-only/editable renderer는 같은 semantic element와 mark nesting을 만들어야 한다. |
| JDRT1-RENDER-002 | Renderer는 toolbar, slash menu, route layout, focus policy와 제품 keyboard policy를 소유하면 안 된다. DOM과 HTML은 canonical storage가 아니다. |
| JDRT1-PACKAGE-001 | Domain package는 Core·Selection·Editing public surface만 사용하고 DOM/React dependency를 가지면 안 된다. 환경 package는 schema와 editing semantics를 재정의하면 안 된다. |
| JDRT1-PACKAGE-002 | 기존 plain string ContentEditable contract는 유지한다. Rich-text Web/React integration은 별도 package에서 Rich Text Domain을 소비해야 한다. |
| JDRT1-CONFORMANCE-001 | 각 normative requirement는 machine-readable vector 또는 static boundary check에 연결되어야 한다. |
| JDRT1-CONFORMANCE-002 | Browser acceptance는 input, IME, selection restore, structured/HTML/plain clipboard와 undo/redo를 실제 contenteditable root에서 검증해야 한다. |

## Canonical persistence contract

### TypeScript shape

```ts
type RichTextNodeId = string;

interface RichTextNodeValue extends Record<string, JSONValue> {
  readonly id: RichTextNodeId;
  readonly type: string;
}

interface RichTextDocument<
  Node extends RichTextNodeValue = RichTextBlockNode,
> extends RichTextNodeValue {
  readonly profile: string;
  readonly id: RichTextNodeId;
  readonly type: "doc";
  readonly content: ReadonlyArray<Node>;
}

type RichTextDocumentV1 = RichTextDocument<RichTextBlockNode> & {
  readonly profile: "urn:interactive-os:json-document:rich-text:1";
};

type RichTextBlockNode =
  | RichTextParagraph
  | RichTextHeading
  | RichTextBlockquote
  | RichTextCodeBlock
  | RichTextBulletList
  | RichTextOrderedList;

type RichTextInlineNode = RichTextText | RichTextHardBreak;
type RichTextContentNode = RichTextBlockNode | RichTextListItem | RichTextInlineNode;
type RichTextNode = RichTextDocumentV1 | RichTextContentNode;

interface RichTextParagraph extends Record<string, JSONValue> {
  readonly id: RichTextNodeId;
  readonly type: "paragraph";
  readonly content: ReadonlyArray<RichTextInlineNode>;
}

interface RichTextHeading extends Record<string, JSONValue> {
  readonly id: RichTextNodeId;
  readonly type: "heading";
  readonly attrs: { readonly level: 1 | 2 | 3 | 4 | 5 | 6 };
  readonly content: ReadonlyArray<RichTextInlineNode>;
}

interface RichTextBlockquote extends Record<string, JSONValue> {
  readonly id: RichTextNodeId;
  readonly type: "blockquote";
  readonly content: ReadonlyArray<RichTextBlockNode>;
}

interface RichTextCodeBlock extends Record<string, JSONValue> {
  readonly id: RichTextNodeId;
  readonly type: "codeBlock";
  readonly attrs: { readonly language: string | null };
  readonly content: readonly [] | readonly [RichTextPlainText];
}

interface RichTextBulletList extends Record<string, JSONValue> {
  readonly id: RichTextNodeId;
  readonly type: "bulletList";
  readonly content: ReadonlyArray<RichTextListItem>;
}

interface RichTextOrderedList extends Record<string, JSONValue> {
  readonly id: RichTextNodeId;
  readonly type: "orderedList";
  readonly attrs: { readonly start: number };
  readonly content: ReadonlyArray<RichTextListItem>;
}

interface RichTextListItem extends Record<string, JSONValue> {
  readonly id: RichTextNodeId;
  readonly type: "listItem";
  readonly content: ReadonlyArray<RichTextBlockNode>;
}

interface RichTextText extends Record<string, JSONValue> {
  readonly id: RichTextNodeId;
  readonly type: "text";
  readonly text: string;
  readonly marks: ReadonlyArray<RichTextMark>;
}

interface RichTextPlainText extends Record<string, JSONValue> {
  readonly id: RichTextNodeId;
  readonly type: "text";
  readonly text: string;
  readonly marks: readonly [];
}

interface RichTextHardBreak extends Record<string, JSONValue> {
  readonly id: RichTextNodeId;
  readonly type: "hardBreak";
}

type RichTextMark =
  | { readonly type: "strong" }
  | { readonly type: "emphasis" }
  | { readonly type: "underline" }
  | { readonly type: "strikethrough" }
  | { readonly type: "code" }
  | {
      readonly type: "link";
      readonly attrs: {
        readonly href: string;
        readonly title?: string;
      };
    };
```

나머지 node의 exact JSON shape는 `schema.json`이 정본이다.

### Canonical example

```json
{
  "profile": "urn:interactive-os:json-document:rich-text:1",
  "id": "document-1",
  "type": "doc",
  "content": [
    {
      "id": "heading-1",
      "type": "heading",
      "attrs": { "level": 2 },
      "content": [
        {
          "id": "text-1",
          "type": "text",
          "text": "JSONDocument Rich Text",
          "marks": [{ "type": "strong" }]
        }
      ]
    },
    {
      "id": "paragraph-1",
      "type": "paragraph",
      "content": []
    }
  ]
}
```

### Content rules

| Node | Required attrs | Allowed content |
| --- | --- | --- |
| `doc` | `profile` | one or more block nodes |
| `paragraph` | none | zero or more inline nodes |
| `heading` | `level: 1..6` | zero or more inline nodes |
| `blockquote` | none | one or more block nodes |
| `codeBlock` | `language: string | null` | zero or one unmarked text node |
| `bulletList` | none | one or more `listItem` nodes |
| `orderedList` | `start: integer >= 1` | one or more `listItem` nodes |
| `listItem` | none | one or more block nodes |
| `text` | none | no children; non-empty text and canonical marks |
| `hardBreak` | none | no children |

`listItem`은 root block이 아니며 list content에서만 유효하다. `doc`은 empty
document를 허용하지 않는다. 새 empty document의 canonical value는 ID가 있는
empty paragraph 하나다.

## Validation and normalization

```ts
type RichTextFailureCode =
  | "rich-text.invalid-document"
  | "rich-text.profile-unavailable"
  | "rich-text.schema-violation"
  | "rich-text.duplicate-id"
  | "rich-text.id-provider-unavailable"
  | "rich-text.noncanonical"
  | "rich-text.point-not-found"
  | "rich-text.invalid-offset"
  | "rich-text.intent-unsupported"
  | "rich-text.clipboard-invalid";

type RichTextValidationFailure =
  {
    readonly ok: false;
    readonly code: RichTextFailureCode;
    readonly reason: string;
    readonly pointer?: string;
    readonly nodeId?: RichTextNodeId;
  };

type RichTextValidationResult =
  | { readonly ok: true }
  | RichTextValidationFailure;

type RichTextNormalizationResult =
  | {
      readonly ok: true;
      readonly value: RichTextDocumentV1;
      readonly operations: ReadonlyArray<JSONPatchOperation>;
      readonly mapping: RangeSelectionMapping<RichTextPoint>;
    }
  | RichTextValidationFailure;
```

`validateRichText`는 input을 변경하지 않는다. `normalizeRichText`는 caller가
제공한 `createId`로만 새 identity를 만들고 결과를 commit하지 않는다.
Normalizer가 고칠 수 없는 profile, unknown type, invalid attrs와 duplicate ID는
실패다.

```ts
interface RichTextValidationOptions {
  readonly schema?: RichTextSchema;
}

interface RichTextNormalizationOptions extends RichTextValidationOptions {
  readonly createId?: () => RichTextNodeId;
}

function validateRichText(
  value: unknown,
  options?: RichTextValidationOptions,
): RichTextValidationResult;

function normalizeRichText(
  value: unknown,
  options?: RichTextNormalizationOptions,
): RichTextNormalizationResult;

function createRichTextNodeId(): RichTextNodeId;
```

Schema default는 `richTextSchemaV1`이다. ID provider default는
`globalThis.crypto.randomUUID()`에 `rt-` prefix를 붙인다. 해당 API가 없는 runtime은
identity를 새로 만드는 normalization/editor operation에서
`rich-text.id-provider-unavailable`로 실패하며 random 또는 process-local counter로
fallback하지 않는다. Test와 deterministic import는 `createId`를 주입한다.

Canonical normalization 순서는 다음과 같다.

1. Empty text node를 제거한다.
2. Mark type 중복을 제거하고 canonical 순서로 정렬한다.
3. 같은 canonical marks를 가진 인접 text node를 병합한다. 앞 node ID를 유지한다.
4. 비게 된 container는 schema가 empty content를 허용할 때 `content: []`로 둔다.
5. `doc.content`가 비면 새 ID를 가진 empty paragraph를 하나 삽입한다.

## Identity, position and mapping

```ts
type RichTextAffinity = "backward" | "forward";

type RichTextPoint =
  | {
      readonly kind: "text";
      readonly nodeId: RichTextNodeId;
      readonly offset: number;
      readonly affinity: RichTextAffinity;
    }
  | {
      readonly kind: "child";
      readonly nodeId: RichTextNodeId;
      readonly offset: number;
      readonly affinity: RichTextAffinity;
    };

type RichTextSelection = RangeSelection<RichTextPoint>;
type RichTextSelectionMapping = RangeSelectionMapping<RichTextPoint>;

type RichTextTarget =
  | {
      readonly kind: "text";
      readonly nodeId: RichTextNodeId;
      readonly from: number;
      readonly to: number;
    }
  | { readonly kind: "node"; readonly nodeId: RichTextNodeId };
```

Text point offset은 JavaScript string의 UTF-16 code unit offset이다. Offset은
`0..text.length`이고 surrogate pair 사이를 가리키면 실패한다. Child point는
container의 child 사이 gap을 가리키며 offset은 `0..content.length`다.

Affinity는 point와 같은 boundary에 content가 삽입될 때 point가 삽입 전
(`backward`) 또는 삽입 뒤(`forward`)에 남는지를 정한다. DOM Selection의 방향은
anchor/focus 순서가 보존하며 affinity와 다른 개념이다.

Operation mapping 규칙:

| Operation | Mapping |
| --- | --- |
| text insert | insertion 뒤 point는 길이만큼 이동; 같은 offset은 affinity로 결정 |
| text delete | 삭제 뒤 point는 길이만큼 당기고 삭제 구간 내부는 시작 boundary로 collapse |
| split text/container | 왼쪽은 기존 ID; split 뒤 point는 새 오른쪽 ID와 상대 offset으로 이동 |
| join text/container | 뒤 node point는 앞 ID와 앞 길이/child count를 더한 offset으로 이동 |
| insert child | 뒤 child offset은 1 증가; 같은 offset은 affinity로 결정 |
| remove child | 제거 node 내부 point는 affinity 방향의 인접 parent child boundary로 이동 |
| move child | node 내부 point는 ID로 유지; source/destination child boundary는 remove+insert 순서로 mapping |

각 transform은 JSON Patch와 mapping을 같은 계획에서 만든다. Applied JSON Patch만
보고 의미적 mapping을 재추론하지 않는다.

## Selection and topology

Rich Text Domain은 다음 기존 contract를 그대로 조합한다.

```ts
const selectionFamily = createRangeSelectionFamily<
  RichTextPoint,
  RichTextTarget
>();

interface RichTextTopology
  extends OrderedTopology<RichTextPoint, RichTextTarget> {}
```

`equals`는 reconciled point의 kind, node ID, offset과 affinity를 비교한다.
`interval`은 anchor에서 focus까지 depth-first logical order로 text segment와 atom
node target을 반환한다. `reconcilePoint`는 같은 node의 offset clamp, retired ID
mapping, affinity 방향의 인접 boundary 순서로 시도하고 document에 유효 boundary가
없을 때만 `null`을 반환한다.

Renderer DOM order는 hidden decoration, browser normalization 또는 custom node
view 때문에 canonical topology가 될 수 없다. Connector는 hit test와 DOM boundary를
`RichTextPoint`로 번역한 뒤 topology에 넘긴다.

## Editing contract

```ts
type RichTextIntent =
  | { readonly type: "selection.set"; readonly selection: RichTextSelection }
  | { readonly type: "selection.remove" }
  | { readonly type: "text.insert"; readonly text: string }
  | {
      readonly type: "text.delete";
      readonly direction: "backward" | "forward";
      readonly unit: "character";
    }
  | { readonly type: "mark.toggle"; readonly mark: RichTextMark }
  | { readonly type: "block.split" }
  | { readonly type: "block.join"; readonly direction: "backward" | "forward" }
  | {
      readonly type: "block.set-type";
      readonly nodeType: "paragraph" | "heading";
      readonly attrs?: Readonly<Record<string, JSONValue>>;
    }
  | { readonly type: "node.insert"; readonly point: RichTextPoint; readonly node: RichTextContentNode }
  | { readonly type: "node.remove"; readonly nodeId: RichTextNodeId }
  | { readonly type: "node.move"; readonly nodeId: RichTextNodeId; readonly point: RichTextPoint }
  | { readonly type: "node.set-attrs"; readonly nodeId: RichTextNodeId; readonly attrs: Readonly<Record<string, JSONValue>> }
  | { readonly type: "clipboard.paste"; readonly clipboard: RichTextClipboard };

interface RichTextEditor extends EditingDispatch<
  RichTextIntent,
  RichTextSelection
> {
  readonly snapshot: EditingSnapshot<RichTextSelection>;
  readonly pointer: Pointer;
  readonly schema: RichTextSchema;
  readonly topology: RichTextTopology;
  copy(): RichTextClipboard | null;
  cut(): {
    readonly clipboard: RichTextClipboard;
    readonly result: EditingResult<RichTextSelection>;
  } | null;
  undo(): EditingResult<RichTextSelection>;
  redo(): EditingResult<RichTextSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<RichTextSelection>) => void): () => void;
}

interface RichTextEditorOptions {
  readonly document: JSONDocument;
  readonly pointer?: Pointer;
  readonly schema?: RichTextSchema;
  readonly selection?: RichTextSelection;
  readonly createId?: () => RichTextNodeId;
}

function createRichTextEditor(options: RichTextEditorOptions): RichTextEditor;

function createRichTextTopology(
  document: RichTextDocument,
  schema?: RichTextSchema,
): RichTextTopology;
```

`pointer` default는 root Pointer `""`, schema default는 `richTextSchemaV1`이다.
Constructor는 pointer가 없거나 subtree가 schema를 통과하지 못하면 `TypeError`를
throw한다. 생성 뒤 intent failure는 throw하지 않고 `EditingResult` failure다.
Rich-text-relative operation path는 commit 전에 `pointer`를 prefix한 RFC 6901 Pointer로
변환한다. Selection과 Topology의 node ID는 root/subtree binding에서 같은 의미다.
Initial selection을 생략하면 topology의 첫 editable child boundary에 collapsed range를
둔다. 제공한 selection은 topology로 reconcile하고 모두 소실될 때 empty
`RangeSelection`으로 시작한다.

`text.delete`의 character는 하나의 Unicode scalar value이며 UTF-16 surrogate pair를
분리하지 않는다. Word/line deletion은 Connector가 platform boundary를 selection으로
확장한 뒤 `selection.remove`와 같은 value-changing selection deletion으로 번역한다.
DOM `inputType`, keyboard shortcut과 제품 command 이름은 Connector/Host가 위 intent로
번역한다.

Value-changing dispatch는 다음 흐름을 지킨다.

```text
RichTextIntent
→ schema-aware transform
→ { operations, mapping }
→ selectionFamily.map(previousSelection, mapping, nextTopology)
→ EditingPlan { operations, selectionAfter, origin, historyGroup }
→ EditingSession.apply()
→ JSONDocument.commit()
```

Required error codes:

| Condition | Code |
| --- | --- |
| profile provider 없음 | `rich-text.profile-unavailable` |
| schema 또는 canonical invariant 위반 | `rich-text.schema-violation` |
| node ID 중복 | `rich-text.duplicate-id` |
| 기본 ID provider를 사용할 수 없음 | `rich-text.id-provider-unavailable` |
| selection node 없음 | `rich-text.point-not-found` |
| invalid UTF-16/child boundary | `rich-text.invalid-offset` |
| 현재 schema에서 intent를 표현할 수 없음 | `rich-text.intent-unsupported` |
| structured clipboard 검증 실패 | `rich-text.clipboard-invalid` |

Failure는 document, selection, history, revision과 notification을 바꾸지 않는다.

`block.set-type`은 paragraph와 heading 사이에서만 ID와 inline content를 보존한다.
Heading으로 바꿀 때 `attrs.level`은 필수이며 paragraph로 바꿀 때 heading attrs는
제거한다. Blockquote, code block과 list 변환은 child structure를 바꾸므로
`block.set-type`으로 추정하지 않고 explicit node insert/remove/move 계획으로 표현한다.

Selection과 text deletion 규칙:

- `selection.remove`는 모든 range를 logical order의 뒤에서 앞으로 삭제하고 primary
  range 시작점에 collapsed selection을 둔다. Collapsed-only selection은 no-op이다.
- Non-collapsed selection에서 `text.delete`는 direction과 무관하게
  `selection.remove`와 같은 계획을 만든다.
- Collapsed `text.delete`는 direction 쪽 Unicode scalar 하나를 삭제한다. Block
  boundary에서는 schema-compatible adjacent text block을 join하고, 호환되지 않으면
  `rich-text.intent-unsupported`다.
- 여러 range의 deletion과 결과 normalization은 하나의 `EditingPlan`과 atomic JSON
  Patch batch다.

## History contract and common gap

Rich Text Domain은 `EditingSession<RichTextSelection>`을 사용한다. 별도 undo stack,
DOM native history와 editor-local snapshot history는 금지한다.

History boundary:

- selection-only transition은 history를 만들지 않는다.
- 한 composition session의 successful text plans는 같은 `historyGroup`을 사용한다.
- composition 전후 selection/value를 하나의 undo/redo 단위로 복원한다.
- mark, block 또는 node structure intent는 active typing group을 닫는다.
- explicit selection transition은 active typing group을 닫는다.

현재 `EditingSession`은 외부 document change에서 local history를 비우고 selection
mapping input을 받지 않는다. Rich Text implementation 전에 shared Editing에
external applied change와 `RangeSelectionMapping`을 받는 rebase contract를 추가해야
한다. 이 gap을 Rich Text package의 private history로 우회하면 안 된다.

## Clipboard contract and common gap

```ts
interface RichTextSlice<
  Node extends RichTextNodeValue = RichTextContentNode,
> extends Record<string, JSONValue> {
  readonly profile: string;
  readonly content: ReadonlyArray<Node>;
  readonly openStart: number;
  readonly openEnd: number;
}

interface RichTextClipboard extends WebClipboardPayload {
  readonly type: "application/vnd.interactive-os.rich-text+json";
  readonly slice: RichTextSlice;
  readonly text: string;
  readonly html: string;
}
```

`openStart`와 `openEnd`는 slice 앞/뒤에서 열린 ancestor depth다. 둘은 0 이상의
정수이며 `content`가 붙을 target의 schema depth와 호환되어야 한다. Paste는 모든
node ID를 새 ID로 remap한다.

Clipboard representations:

| MIME | 내용 | Paste priority |
| --- | --- | ---: |
| `application/vnd.interactive-os.rich-text+json` | versioned `RichTextSlice` | 1 |
| `text/html` | official semantic HTML projection | 2 |
| `text/plain` | block boundary를 LF로 표현한 plain text | 3 |

현재 `createWebClipboardBinding`은 structured MIME과 `text/plain`만 쓰고 structured
payload가 없으면 paste를 host에 돌려준다. Rich Text implementation 전에 Web
Clipboard contract를 ordered representations와 parser chain을 받을 수 있게
일반화해야 한다. Rich Text package가 별도 ClipboardEvent engine을 만들면 안 된다.

## Schema extension and format adapter

```ts
interface RichTextSchema {
  readonly profile: string;
  readonly nodes: Readonly<Record<string, RichTextNodeSpec>>;
  readonly marks: Readonly<Record<string, RichTextMarkSpec>>;
}

interface RichTextAttributeSpec {
  readonly required: boolean;
  readonly default?: JSONValue;
  validate(value: JSONValue): boolean;
}

interface RichTextContentSpec {
  readonly allowedTypes: ReadonlyArray<string>;
  readonly minimum: number;
  readonly maximum: number | null;
}

interface RichTextNodeSpec {
  readonly group: "block" | "inline";
  readonly atom: boolean;
  readonly attrs: Readonly<Record<string, RichTextAttributeSpec>>;
  readonly content: RichTextContentSpec | null;
  readonly allowedMarks: "all" | "none" | ReadonlyArray<string>;
}

interface RichTextMarkSpec {
  readonly attrs: Readonly<Record<string, RichTextAttributeSpec>>;
  readonly excludes: ReadonlyArray<string>;
  readonly rank: number;
}

function createRichTextSchema(options: {
  readonly profile: string;
  readonly nodes?: Readonly<Record<string, RichTextNodeSpec>>;
  readonly marks?: Readonly<Record<string, RichTextMarkSpec>>;
}): RichTextSchema;
```

- Official `richTextSchemaV1`은 수정할 수 없는 base schema다.
- Extension schema는 base를 복사하지 않고 `createRichTextSchema`로 official specs를
  조합하며 official profile과 다른 absolute URI/URN을 가진다.
- Extension type은 reverse-DNS namespace와 slash를 사용한다. 예:
  `com.example/mention`, `org.example/comment`.
- Extension type은
  `^[a-z][a-z0-9-]*(?:\\.[a-z][a-z0-9-]*)+/[a-z][a-z0-9-]*$`를 만족한다.
- Extension은 official type을 재정의할 수 없다.
- Node/mark type 충돌, absolute URI/URN이 아닌 profile, 음수 mark rank와
  `required: true`이면서 `default`도 가진 attr는 construction-time `TypeError`다.
- 같은 rank의 mark는 type 이름의 Unicode code point 오름차순으로 정렬한다.
- `atom: true` node는 `content: null`이어야 한다. `content: null` node의
  `allowedMarks`는 `"none"`이어야 한다.
- `minimum`은 0 이상의 정수이고 `maximum`은 `null` 또는 `minimum` 이상의
  정수다. Child type은 현재 schema에 등록되어 있어야 한다.
- Document profile provider가 없으면 raw JSON은 JSONDocument에 그대로 남지만
  strict validation과 editing은 `rich-text.profile-unavailable`로 실패한다.
- Renderer는 unknown node/mark와 raw JSON을 host fallback에 전달하고 삭제하거나
  빈 output으로 숨기지 않는다.

HTML, ProseMirror JSON, Portable Text와 완전히 다른 app schema는 Schema Extension이
아니라 Format Adapter다. Adapter는 input format validation, ID 생성, normalization과
loss report를 소유하며 Core나 Rich Text canonical format을 변경하지 않는다.

## Rendering contract

Domain package는 DOM이나 React를 import하지 않는 traversal contract를 제공한다.

```ts
interface RichTextRenderAdapter<
  Output,
  Node extends RichTextNodeValue = RichTextContentNode,
> {
  document(document: RichTextDocument<Node>, children: readonly Output[]): Output;
  text(node: RichTextText): Output;
  node(node: Exclude<Node, RichTextText>, children: readonly Output[]): Output;
  mark(mark: RichTextMark, children: readonly Output[]): Output;
  unknown(value: JSONValue): Output;
}

type RichTextRenderDiagnosticCode =
  | "rich-text.unsafe-link"
  | "rich-text.unknown-node"
  | "rich-text.unknown-mark";

interface RichTextRenderDiagnostic {
  readonly code: RichTextRenderDiagnosticCode;
  readonly reason: string;
  readonly nodeId?: RichTextNodeId;
  readonly markType?: string;
}

interface RichTextRenderResult<Output> {
  readonly output: Output;
  readonly diagnostics: ReadonlyArray<RichTextRenderDiagnostic>;
}

function renderRichText<Output, Node extends RichTextNodeValue>(
  document: RichTextDocument<Node>,
  schema: RichTextSchema | null,
  adapter: RichTextRenderAdapter<Output, Node>,
): RichTextRenderResult<Output>;
```

Official semantic HTML mapping:

| Schema type | Semantic element |
| --- | --- |
| `paragraph` | `p` |
| `heading` | `h1`..`h6` from `attrs.level` |
| `blockquote` | `blockquote` |
| `codeBlock` | `pre > code` |
| `bulletList` | `ul` |
| `orderedList` | `ol[start]` |
| `listItem` | `li` |
| `hardBreak` | `br` |
| `strong` | `strong` |
| `emphasis` | `em` |
| `underline` | `u` |
| `strikethrough` | `s` |
| `code` | `code` |
| `link` | URL policy를 통과한 `a[href][title?]` |

Mark nesting follows canonical mark order. Renderer override는 output만 바꾸며 schema,
JSON, intent와 selection 의미를 바꾸지 않는다. HTML parser/renderer는 Web package,
React element renderer는 React package가 소유한다.

Official HTML URL policy는 `http:`, `https:`, `mailto:`, `tel:` absolute URI와
`/`, `./`, `../`, `#`, `?`로 시작하는 relative reference만 link `href`로 출력한다.
다른 scheme 또는 제어 문자가 있는 값은 anchor 없이 children만 출력하고
`rich-text.unsafe-link` diagnostic을 낸다. Host override는 이 allowlist를 더 좁힐
수만 있다.

## Package and public surface contract

```text
@interactive-os/json-document-rich-text
├─ peers: json-document, json-document-selection, json-document-editing
├─ owns: schema/model/validation/normalization/position/intent/topology/clipboard shape
└─ owns: target-neutral RichTextRenderAdapter traversal

@interactive-os/json-document-rich-text-web
├─ peers: json-document-rich-text, json-document-web
├─ owns: HTML adapter, multi-representation Web clipboard codec
└─ owns: DOM Selection/contenteditable adapter and native-input DOM lease

@interactive-os/json-document-rich-text-react
├─ peers: react, json-document-rich-text
├─ uses: json-document-react and rich-text-web when editable
└─ owns: official read-only React renderer and editable lifecycle binding
```

`@interactive-os/json-document-contenteditable`의 기존 one-string-pointer public API와
lease 의미는 유지한다. Rich Text Web package가 이를 deep import하거나 schema
semantics를 plain string package에 넣으면 안 된다.

Editable renderer는 node ID를 React key 또는 adapter-owned DOM mapping에 사용할 수
있지만 clipboard `text/html`에 internal node ID attribute를 내보내면 안 된다. DOM
node, React key와 `data-*` attribute는 canonical identity store가 아니며 rerender 뒤
Official Rich Text document의 ID에서 다시 구성한다.

Domain package의 initial root entrypoint:

```ts
export {
  createRichTextEditor,
  createRichTextNodeId,
  createRichTextSchema,
  createRichTextTopology,
  normalizeRichText,
  renderRichText,
  richTextSchemaV1,
  validateRichText,
};

export type {
  RichTextAffinity,
  RichTextAttributeSpec,
  RichTextBlockNode,
  RichTextBlockquote,
  RichTextBulletList,
  RichTextClipboard,
  RichTextCodeBlock,
  RichTextContentSpec,
  RichTextContentNode,
  RichTextDocument,
  RichTextDocumentV1,
  RichTextEditor,
  RichTextEditorOptions,
  RichTextFailureCode,
  RichTextHardBreak,
  RichTextHeading,
  RichTextInlineNode,
  RichTextIntent,
  RichTextListItem,
  RichTextMark,
  RichTextMarkSpec,
  RichTextNode,
  RichTextNodeId,
  RichTextNodeValue,
  RichTextNodeSpec,
  RichTextNormalizationResult,
  RichTextNormalizationOptions,
  RichTextOrderedList,
  RichTextParagraph,
  RichTextPlainText,
  RichTextPoint,
  RichTextRenderAdapter,
  RichTextRenderDiagnostic,
  RichTextRenderDiagnosticCode,
  RichTextRenderResult,
  RichTextSchema,
  RichTextSelection,
  RichTextSelectionMapping,
  RichTextSlice,
  RichTextTarget,
  RichTextText,
  RichTextTopology,
  RichTextValidationFailure,
  RichTextValidationOptions,
  RichTextValidationResult,
};
```

새 subpath는 독립 responsibility와 consumer가 증명되기 전 추가하지 않는다.

## Conformance topology

```text
profile.md
├─ schema.json
├─ conformance/vectors/rich-text.json
└─ evaluate.mjs
        ↓
implementation child issues
├─ schema/model
├─ shared Editing/Web capability gaps
├─ Rich Text editing integration
├─ Web/React renderer and contenteditable
└─ Demo/browser acceptance
```

Vector는 최소 다음을 포함한다.

- canonical document와 structural invalid document
- duplicate ID, noncanonical adjacent text/marks
- text insert/delete와 split/join mapping
- deleted point reconciliation
- Selection/Topology interval
- intent → EditingPlan → JSON Patch
- composition history group
- structured/HTML/plain clipboard priority와 ID remap
- official semantic rendering
- extension profile unavailable/preserve fallback
- package dependency boundary

RFC 동결 뒤의 implementation dependency graph는 다음과 같다. 각 node는 별도
review와 release evidence를 가질 수 있을 때만 child issue가 된다.

```text
A schema/model/validation/normalization
├─> D Rich Text editing/topology integration
├─> F React read-only renderer
└─> E Rich Text Web/HTML adapter

B shared Editing external-change mapping/rebase
└─> D

C shared Web Clipboard multi-representation contract
└─> E

D + E + F
└─> G contenteditable integration, conformance and Live Demo
```

A, B, C는 RFC 승인 뒤 독립적으로 시작할 수 있다. D는 A와 B, E는 A와 C, F는 A,
G는 D·E·F의 acceptance를 요구한다. #361은 이 graph의 progress를 추적하며 각
child issue는 자기 node 밖의 Done을 가져오지 않는다.

## Replan triggers

다음이 관찰되면 implementation scope를 늘리지 않고 #361로 돌아간다.

1. Stable node identity가 collaboration text/structural profile과 양립하지 않는다.
2. `RangeSelection` 또는 `OrderedTopology`로 text/atom 범위를 표현할 수 없다.
3. `EditingSession`을 일반화해도 selection/history를 함께 유지할 수 없다.
4. Web Clipboard를 일반화해도 structured/HTML/plain representations를 한 operation으로
   보존할 수 없다.
5. Official Renderer가 semantic projection을 넘어 제품 UI policy를 소유해야만
   browser acceptance를 통과한다.

## Primary references

- [ProseMirror Guide](https://prosemirror.net/docs/guide/): schema, typed nodes,
  marks, transforms와 position mapping의 de-facto reference.
- [Portable Text specification](https://github.com/portabletext/portabletext):
  presentation-independent JSON block/inline model의 공개 specification. 현재
  `v0.0.1 WORKING DRAFT`이므로 wire format의 normative authority로 사용하지 않는다.
- [Lexical Editor State](https://lexical.dev/docs/concepts/editor-state): DOM이 아닌
  immutable editor state와 serializable node tree의 독립 reference.
- [WHATWG HTML editing hosts](https://html.spec.whatwg.org/multipage/interaction.html):
  `contenteditable` platform semantics의 normative reference. 저장 schema는 정의하지
  않는다.
