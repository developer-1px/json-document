# @interactive-os/json-document-canvas API

**탐색 분류:** Hands

Canvas 선택·변형·입력·UI 조합의 public entrypoint입니다. API의 owner는 이 package이며 탐색 분류는 저장소의 아키텍처 등록에서 읽는 위치입니다. 별도 subpath 표시가 없는 항목은 package root에서 import합니다. internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-canvas/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `CanvasClipboardPolicy`

```ts
interface CanvasClipboardPolicy {
  readonly textColor: string;
  readonly fontSize: number;
  readonly files?: FileAcceptancePolicy;
  readonly maxImagePixels?: number;
}
```
## `CanvasCreationStyle`

```ts
interface CanvasCreationStyle {
  readonly color: string;
  readonly textColor: string;
  readonly fontSize: number;
  readonly strokeWidth: number;
  /** Sticky-note fill; omitted hosts reuse their ordinary object fill. */
  readonly stickyNoteColor?: string;
}
```
## `CanvasHand`

```ts
CanvasHand(props: CanvasHandProps): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `CanvasHandProps`

```ts
interface CanvasHandProps {
  readonly editor: ObjectEditor;
  readonly creationStyle: CanvasCreationStyle;
  readonly className?: string;
  readonly slideStyle?: CSSProperties;
  readonly label?: string;
  /** Optional policy instance; one profile per mounted Hand. */
  readonly selectProfile?: PlaneSelectProfile;
}
```
## `CanvasTool`

```ts
type CanvasTool = "select" | Exclude<CanvasObjectKind, "image">;
```
## `createCanvasClipboardBinding`

```ts
createCanvasClipboardBinding(editor: ObjectEditor, policy: CanvasClipboardPolicy, options?: { readonly readRaster?: typeof readWebRasterFile; readonly onResult?: (result: { readonly ok: boolean; readonly code?: string; readonly reason?: string; }) => void; readonly onPendingChange?: (pending: boolean) => void; }): { ...; }
```
## `useCanvasHand`

```ts
useCanvasHand(editor: ObjectEditor, style: CanvasCreationStyle, selectProfile?: PlaneSelectProfile): { document: CanvasDocument; snapshot: import("<repository>/packages/json-document-editing/src/session").EditingSnapshot<ObjectSelection>; ... 23 more ...; surfaceProps: { ...; }; }
```
