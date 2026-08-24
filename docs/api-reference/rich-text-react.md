# @interactive-os/json-document-rich-text-react API

**Owner:** Connector

Rich Text React connector의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-rich-text-react/src/index.tsx`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

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
## `RichTextEditorSurface`

```ts
RichTextEditorSurface({ editor, as, createId, onAction, renderExtension, renderExtensionMark, renderUnknown, elementRef, ...props }: RichTextEditorSurfaceProps): React.DetailedReactHTMLElement<{ style: { whiteSpace: "pre-wrap"; accentColor?: CSS.Property.AccentColor | undefined; ... 854 more ...; glyphOrientationVertical?: CSS.Property.GlyphOrientationVertical | undefined; }; ... 277 more ...; onTransitionStartCapture?: React.TransitionEventHandler<...>; }, HTMLElement>
```
## `RichTextEditorSurfaceProps`

```ts
interface RichTextEditorSurfaceProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "contentEditable" | "onInput"> {
  readonly editor: RichTextEditor;
  readonly as?: "article" | "div" | "section";
  readonly createId?: () => string;
  readonly onAction?: (action: string, result?: ReturnType<RichTextEditor["dispatch"]>) => void;
  readonly renderExtension?: RichTextRendererProps["renderExtension"];
  readonly renderExtensionMark?: RichTextRendererProps["renderExtensionMark"];
  readonly renderUnknown?: RichTextRendererProps["renderUnknown"];
  readonly elementRef?: { current: HTMLElement | null };
}
```
## `RichTextNode`

```ts
type RichTextNode = RichTextContentNode;
```
## `RichTextRenderer`

```ts
RichTextRenderer({ document, schema, renderExtension, renderExtensionMark, renderUnknown }: RichTextRendererProps): ReactNode
```
## `RichTextRendererProps`

```ts
interface RichTextRendererProps {
  readonly document: RichTextDocument;
  readonly schema?: RichTextSchema;
  readonly renderExtension?: (node: RichTextNode, children: ReadonlyArray<ReactNode>) => ReactNode;
  readonly renderExtensionMark?: (mark: RichTextMark, children: ReadonlyArray<ReactNode>) => ReactNode;
  readonly renderUnknown?: (value: unknown) => ReactNode;
}
```
