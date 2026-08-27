# @interactive-os/json-document-rich-text API

**Owner:** Editing

Rich Text domain과 editing 계약의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-rich-text/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `appliedOperationsFor`

```ts
appliedOperationsFor(value: object): ReadonlyArray<{ readonly op: string; readonly path: string; }> | null
```
## `createRichTextBlockFixture`

```ts
createRichTextBlockFixture(size: number, options?: { readonly text?: string; readonly idPrefix?: string; }): RichTextDocument
```
## `createRichTextEditor`

```ts
createRichTextEditor(options: RichTextEditorOptions): RichTextEditor
```
## `createRichTextInstrument`

```ts
createRichTextInstrument(): RichTextInstrument
```
## `createRichTextNodeId`

```ts
createRichTextNodeId(): RichTextNodeId
```
## `createRichTextSchema`

```ts
createRichTextSchema(options: { readonly profile: string; readonly nodes?: Readonly<Record<string, RichTextNodeSpec>>; readonly marks?: Readonly<Record<string, RichTextMarkSpec>>; }): RichTextSchema
```
## `createRichTextTopology`

```ts
createRichTextTopology(document: RichTextDocument): RichTextTopology
```
## `hasRichTextContent`

```ts
hasRichTextContent(node: RichTextNode | RichTextDocument): node is (RichTextNode & { readonly content: ReadonlyArray<RichTextNode>; }) | RichTextDocument
```
## `isRichTextDocument`

```ts
isRichTextDocument(value: JSONValue): value is RichTextDocument
```
## `isRichTextText`

```ts
isRichTextText(node: RichTextNode | RichTextDocument): node is RichTextText
```
## `normalizeRichText`

```ts
normalizeRichText(value: unknown, options?: { readonly schema?: RichTextSchema; readonly createId?: () => RichTextNodeId; readonly inputOwnership?: "detached" | "borrowed"; }): RichTextNormalizationResult
```
## `renderRichText`

```ts
renderRichText<Output>(document: RichTextDocument, adapter: RichTextRenderAdapter<Output>): RichTextRenderResult<Output>
renderRichText<Output>(document: RichTextDocument, schema: RichTextSchema | null, adapter: RichTextRenderAdapter<Output>): RichTextRenderResult<Output>
```
## `RICH_TEXT_CLIPBOARD_MIME`

```ts
const RICH_TEXT_CLIPBOARD_MIME: "application/vnd.interactive-os.rich-text+json"
```
## `RICH_TEXT_PROFILE_V1`

```ts
const RICH_TEXT_PROFILE_V1: "urn:interactive-os:json-document:rich-text:1"
```
## `RichTextAffinity`

```ts
type RichTextAffinity = "backward" | "forward";
```
## `RichTextAttributeSpec`

```ts
interface RichTextAttributeSpec {
  readonly required: boolean;
  readonly default?: JSONValue;
  readonly nodeReference?: boolean;
  validate(value: JSONValue): boolean;
}
```
## `RichTextBlockNode`

```ts
type RichTextBlockNode =
  | RichTextParagraph
  | RichTextHeading
  | RichTextBlockquote
  | RichTextCodeBlock
  | RichTextBulletList
  | RichTextOrderedList;
```
## `RichTextBlockquote`

```ts
interface RichTextBlockquote extends RichTextNodeValue {
  readonly type: "blockquote";
  readonly content: ReadonlyArray<RichTextBlockNode>;
}
```
## `RichTextBulletList`

```ts
interface RichTextBulletList extends RichTextNodeValue {
  readonly type: "bulletList";
  readonly content: ReadonlyArray<RichTextListItem>;
}
```
## `RichTextClipboard`

```ts
interface RichTextClipboard {
  readonly type: typeof RICH_TEXT_CLIPBOARD_MIME;
  readonly slice: RichTextSlice;
  readonly text: string;
  readonly html: string;
}
```
## `RichTextCodeBlock`

```ts
interface RichTextCodeBlock extends RichTextNodeValue {
  readonly type: "codeBlock";
  readonly attrs: { readonly language: string | null };
  readonly content: readonly [] | readonly [RichTextPlainText];
}
```
## `RichTextContentNode`

```ts
type RichTextContentNode = RichTextBlockNode | RichTextListItem | RichTextInlineNode | RichTextExtensionNode;
```
## `RichTextContentSpec`

```ts
interface RichTextContentSpec {
  readonly allowedTypes: ReadonlyArray<string>;
  readonly minimum: number;
  readonly maximum: number | null;
}
```
## `RichTextDocument`

```ts
interface RichTextDocument extends RichTextNodeValue {
  readonly profile: string;
  readonly type: "doc";
  readonly content: ReadonlyArray<RichTextBlockNode | RichTextExtensionNode>;
}
```
## `RichTextEditor`

```ts
interface RichTextEditor {
  readonly snapshot: EditingSnapshot<RichTextSelection>;
  readonly pointer: Pointer;
  readonly schema: RichTextSchema;
  readonly topology: RichTextTopology;
  dispatch(intent: RichTextIntent): EditingResult<RichTextSelection>;
  apply(operations: ReadonlyArray<JSONPatchOperation>, options?: { readonly origin?: string; readonly historyGroup?: string }): EditingResult<RichTextSelection>;
  copy(): RichTextClipboard | null;
  cut(): { readonly clipboard: RichTextClipboard; readonly result: EditingResult<RichTextSelection> } | null;
  undo(): EditingResult<RichTextSelection>;
  redo(): EditingResult<RichTextSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<RichTextSelection>) => void): () => void;
}
```
## `RichTextEditorCreationResult`

```ts
type RichTextEditorCreationResult =
  | { readonly ok: true; readonly editor: RichTextEditor }
  | RichTextValidationFailure;
```
## `RichTextEditorOptions`

```ts
interface RichTextEditorOptions {
  readonly document: JSONDocument;
  readonly pointer?: Pointer;
  readonly selection?: RichTextSelection;
  readonly createId?: () => string;
  readonly schema?: RichTextSchema;
}
```
## `RichTextExtensionMark`

```ts
type RichTextExtensionMark = {
  readonly type: `${string}/${string}`;
  readonly attrs?: Readonly<Record<string, JSONValue>>;
};
```
## `RichTextExtensionNode`

```ts
type RichTextExtensionNode = RichTextExtensionBase & (
  | { readonly attrs: Readonly<Record<string, JSONValue>>; readonly content: ReadonlyArray<RichTextNode> }
  | { readonly attrs: Readonly<Record<string, JSONValue>> }
  | { readonly content: ReadonlyArray<RichTextNode> }
  | Record<never, never>
);
```
## `RichTextFailureCode`

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
```
## `RichTextHardBreak`

```ts
interface RichTextHardBreak extends RichTextNodeValue {
  readonly type: "hardBreak";
}
```
## `RichTextHeading`

```ts
interface RichTextHeading extends RichTextNodeValue {
  readonly type: "heading";
  readonly attrs: { readonly level: 1 | 2 | 3 | 4 | 5 | 6 };
  readonly content: ReadonlyArray<RichTextInlineNode>;
}
```
## `RichTextInlineNode`

```ts
type RichTextInlineNode = RichTextText | RichTextHardBreak;
```
## `RichTextInstrument`

```ts
interface RichTextInstrument {
  topologyCreate(): void;
  topologyAdopt(): void;
  topologyVisit(): void;
  visitNode(): void;
  contentCopy(): void;
  validate(mode: "full" | "incremental" | "full-fallback"): void;
  snapshot(): RichTextInstrumentSnapshot;
  reset(): void;
}
```
## `RichTextInstrumentSnapshot`

```ts
interface RichTextInstrumentSnapshot {
  readonly topologyCreates: number;
  readonly topologyAdopts: number;
  readonly topologyVisits: number;
  readonly visitedNodes: number;
  readonly contentCopies: number;
  readonly fullValidations: number;
  readonly incrementalValidations: number;
  readonly fullValidationFallbacks: number;
}
```
## `RichTextIntent`

```ts
type RichTextIntent =
  | { readonly type: "selection.set"; readonly selection: RichTextSelection }
  | { readonly type: "selection.remove" }
  | { readonly type: "text.insert"; readonly text: string; readonly historyGroup?: string }
  | { readonly type: "text.delete"; readonly direction: "backward" | "forward"; readonly unit: "character" }
  | { readonly type: "mark.toggle"; readonly mark: RichTextMark }
  | { readonly type: "block.split" }
  | { readonly type: "block.join"; readonly direction: "backward" | "forward" }
  | { readonly type: "block.set-type"; readonly nodeType: "paragraph" | "heading"; readonly attrs?: Readonly<Record<string, import("@interactive-os/json-document").JSONValue>> }
  | { readonly type: "node.insert"; readonly point: RichTextPoint; readonly node: RichTextContentNode }
  | { readonly type: "node.remove"; readonly nodeId: string }
  | { readonly type: "node.move"; readonly nodeId: string; readonly point: RichTextPoint }
  | { readonly type: "node.set-attrs"; readonly nodeId: string; readonly attrs: Readonly<Record<string, import("@interactive-os/json-document").JSONValue>> }
  | { readonly type: "clipboard.paste"; readonly clipboard: RichTextClipboard };
```
## `RichTextListItem`

```ts
interface RichTextListItem extends RichTextNodeValue {
  readonly type: "listItem";
  readonly content: ReadonlyArray<RichTextBlockNode>;
}
```
## `RichTextLocatedNode`

```ts
interface RichTextLocatedNode {
  readonly node: RichTextNode | RichTextDocument;
  readonly order: number;
  readonly path: ReadonlyArray<number>;
}
```
## `RichTextMark`

```ts
type RichTextMark = RichTextOfficialMark | RichTextExtensionMark;
```
## `RichTextMarkSpec`

```ts
interface RichTextMarkSpec {
  readonly attrs: Readonly<Record<string, RichTextAttributeSpec>>;
  readonly excludes: ReadonlyArray<string>;
  readonly rank: number;
}
```
## `RichTextNode`

```ts
type RichTextNode = RichTextContentNode;
```
## `RichTextNodeId`

```ts
type RichTextNodeId = string;
```
## `RichTextNodeSpec`

```ts
interface RichTextNodeSpec {
  readonly group: "block" | "inline";
  readonly atom: boolean;
  readonly attrs: Readonly<Record<string, RichTextAttributeSpec>>;
  readonly content: RichTextContentSpec | null;
  readonly allowedMarks: "all" | "none" | ReadonlyArray<string>;
}
```
## `RichTextNodeValue`

```ts
interface RichTextNodeValue extends Record<string, JSONValue> {
  readonly id: RichTextNodeId;
  readonly type: string;
}
```
## `RichTextNormalizationResult`

```ts
type RichTextNormalizationResult =
  | {
      readonly ok: true;
      readonly value: RichTextDocument;
      readonly operations: ReadonlyArray<JSONPatchOperation>;
      readonly mapping: RangeSelectionMapping<RichTextPoint>;
    }
  | RichTextValidationFailure;
```
## `RichTextOfficialMark`

```ts
type RichTextOfficialMark =
  | { readonly type: "strong" }
  | { readonly type: "emphasis" }
  | { readonly type: "underline" }
  | { readonly type: "strikethrough" }
  | { readonly type: "code" }
  | { readonly type: "link"; readonly attrs: { readonly href: string; readonly title?: string } };
```
## `RichTextOrderedList`

```ts
interface RichTextOrderedList extends RichTextNodeValue {
  readonly type: "orderedList";
  readonly attrs: { readonly start: number };
  readonly content: ReadonlyArray<RichTextListItem>;
}
```
## `RichTextParagraph`

```ts
interface RichTextParagraph extends RichTextNodeValue {
  readonly type: "paragraph";
  readonly content: ReadonlyArray<RichTextInlineNode>;
}
```
## `richTextPlainText`

```ts
richTextPlainText(nodes: ReadonlyArray<RichTextNode>): string
```
## `RichTextPlainText`

```ts
interface RichTextPlainText extends RichTextText {
  readonly marks: readonly [];
}
```
## `RichTextPoint`

```ts
type RichTextPoint =
  | ({
      readonly kind: "text";
      readonly nodeId: string;
      readonly offset: number;
      readonly affinity: RichTextAffinity;
    } & Readonly<Record<string, JSONValue>>)
  | ({
      readonly kind: "child";
      readonly nodeId: string;
      readonly offset: number;
      readonly affinity: RichTextAffinity;
    } & Readonly<Record<string, JSONValue>>);
```
## `RichTextRenderAdapter`

```ts
interface RichTextRenderAdapter<Output> {
  document(document: RichTextDocument, children: readonly Output[]): Output;
  text(node: RichTextText): Output;
  node(node: Exclude<RichTextNode, RichTextText>, children: readonly Output[]): Output;
  mark(mark: RichTextMark, children: readonly Output[]): Output;
  unknown(value: JSONValue): Output;
}
```
## `RichTextRenderDiagnostic`

```ts
interface RichTextRenderDiagnostic {
  readonly code: RichTextRenderDiagnosticCode;
  readonly reason: string;
  readonly nodeId?: string;
  readonly markType?: string;
}
```
## `RichTextRenderDiagnosticCode`

```ts
type RichTextRenderDiagnosticCode = "rich-text.unsafe-link" | "rich-text.unknown-node" | "rich-text.unknown-mark";
```
## `RichTextRenderResult`

```ts
interface RichTextRenderResult<Output> {
  readonly output: Output;
  readonly diagnostics: ReadonlyArray<RichTextRenderDiagnostic>;
}
```
## `RichTextSchema`

```ts
interface RichTextSchema {
  readonly profile: string;
  readonly nodes: Readonly<Record<string, RichTextNodeSpec>>;
  readonly marks: Readonly<Record<string, RichTextMarkSpec>>;
}
```
## `richTextSchemaV1`

```ts
const richTextSchemaV1: RichTextSchema
```
## `RichTextSelection`

```ts
type RichTextSelection = RangeSelection<RichTextPoint> & Readonly<Record<string, JSONValue>>;
```
## `RichTextSlice`

```ts
interface RichTextSlice extends Record<string, JSONValue> {
  readonly profile: string;
  readonly content: ReadonlyArray<RichTextNode>;
  readonly openStart: number;
  readonly openEnd: number;
}
```
## `RichTextTarget`

```ts
type RichTextTarget =
  | { readonly kind: "text"; readonly nodeId: string; readonly from: number; readonly to: number }
  | { readonly kind: "node"; readonly nodeId: string };
```
## `RichTextText`

```ts
interface RichTextText extends RichTextNodeValue {
  readonly type: "text";
  readonly text: string;
  readonly marks: ReadonlyArray<RichTextMark>;
}
```
## `richTextTopology`

```ts
richTextTopology(document: RichTextDocument): RichTextTopology
```
## `RichTextTopology`

```ts
interface RichTextTopology extends OrderedTopology<RichTextPoint, RichTextTarget> {
  locate(nodeId: string): RichTextLocatedNode | null;
}
```
## `RichTextValidationFailure`

```ts
interface RichTextValidationFailure {
  readonly ok: false;
  readonly code: RichTextFailureCode;
  readonly reason: string;
  readonly pointer?: Pointer;
  readonly nodeId?: RichTextNodeId;
}
```
## `RichTextValidationResult`

```ts
type RichTextValidationResult = { readonly ok: true } | RichTextValidationFailure;
```
## `runWithRichTextInstrument`

```ts
runWithRichTextInstrument<Value>(instrument: RichTextInstrument, run: () => Value): Value
```
## `tryCreateRichTextEditor`

```ts
tryCreateRichTextEditor(options: RichTextEditorOptions): RichTextEditorCreationResult
```
## `validateRichText`

```ts
validateRichText(value: unknown, options?: { readonly schema?: RichTextSchema; readonly onNode?: (node: RichTextDocument | RichTextNode, path: ReadonlyArray<number>) => void; }): RichTextValidationResult
```
## `validateRichTextNodeAt`

```ts
validateRichTextNodeAt(document: RichTextDocument, path: ReadonlyArray<number>, node: RichTextDocument | RichTextNode, options?: { readonly schema?: RichTextSchema; }): RichTextValidationResult
```
## `validateRichTextPath`

```ts
validateRichTextPath(document: RichTextDocument, path: ReadonlyArray<number>, options?: { readonly schema?: RichTextSchema; }): RichTextValidationResult
```
