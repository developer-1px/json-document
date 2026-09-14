# @interactive-os/json-document-sheet API

**탐색 분류:** Hands

Sheet와 Markdown 표의 셀 선택·편집·구조 조작 UI 조합의 public entrypoint입니다. API의 owner는 이 package이며 탐색 분류는 저장소의 아키텍처 등록에서 읽는 위치입니다. 별도 subpath 표시가 없는 항목은 package root에서 import합니다. internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-sheet/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `SheetCellEditorProps`

```ts
interface SheetCellEditorProps {
  readonly label: string;
  readonly value: string;
  readonly initialSelection?: "all" | "end";
  readonly style: CSSProperties;
  readonly onValueChange: (value: string) => void;
  readonly onKeyDown: KeyboardEventHandler<HTMLElement>;
  readonly onBlur: FocusEventHandler<HTMLElement>;
}
```
## `SheetHand`

```ts
SheetHand({ editor, label, headerRow, coordinateHeaders, profile, renderCell, renderEditor, onExit, onDeactivate }: SheetHandProps): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `SheetHandProps`

```ts
interface SheetHandProps {
  readonly editor: SheetEditor;
  readonly label?: string;
  /** Display positional A/B/C headers for an application grid instead of field labels. */
  readonly coordinateHeaders?: boolean;
  /** Header row presentation only; structure restrictions belong to editor.structure. */
  readonly headerRow?: boolean;
  /** Spreadsheet Enter starts editing on Mac; explicit policy objects override platform defaults. */
  readonly profile?: keyof typeof gridEditingProfiles | GridEditingProfile;
  readonly onDeactivate?: () => void;
  readonly onExit?: (edge: "before" | "after") => void;
  readonly renderCell?: (value: string) => ReactNode;
  /** Format-owned editor, e.g. Markdown. Receives a draft contract, never document/history ownership. */
  readonly renderEditor?: (props: SheetCellEditorProps) => ReactNode;
}
```
