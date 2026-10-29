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
  /** Mounted HTML content above the same Canvas interaction surface. */
  readonly screenOverlay?: {
    readonly width: number;
    readonly height: number;
    readonly onObjectsChange: (objects: readonly CanvasObject[]) => void;
  };
  /** Fill the host and navigate independently of document coordinates. */
  readonly workspace?: boolean;
  /** Pixel-sized workspace with scrolling, without zoom or fit controls. */
  readonly navigation?: "free" | "fixed";
  readonly onViewportChange?: (bounds: import("@interactive-os/json-document-object-document").ObjectBounds) => void;
  readonly creationTools?: readonly CanvasTool[];
  readonly toolbarContent?: ReactNode;
  readonly documentControls?: boolean;
  readonly contentToolbar?: boolean;
  readonly renderEmbedded?: (object: Extract<import("@interactive-os/json-document-object-document").CanvasObject, {kind: "embedded-document"}>) => ReactNode;
  readonly onEditEmbedded?: (objectId: string) => void;
  readonly editor: ObjectEditor;
  readonly creationStyle: CanvasCreationStyle;
  readonly className?: string;
  readonly slideStyle?: CSSProperties;
  readonly label?: string;
  /** Optional policy instance; one profile per mounted Hand. */
  readonly selectProfile?: PlaneSelectProfile;
}
```
## `CanvasSheetObject`

```ts
CanvasSheetObject({ object, editor, active, onDeactivate }: { readonly object: Extract<CanvasObject, { kind: "embedded-document"; }>; readonly editor: ObjectEditor; readonly active: boolean; readonly onDeactivate: () => void; }): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `CanvasTool`

```ts
type CanvasTool = "select" | "table" | Exclude<CanvasObjectKind, "image" | "embedded-document">;
```
## `createCanvasClipboardBinding`

```ts
createCanvasClipboardBinding(editor: ObjectEditor, policy: CanvasClipboardPolicy, options?: { readonly readRaster?: typeof readWebRasterFile; readonly onResult?: (result: { readonly ok: boolean; readonly code?: string; readonly reason?: string; }) => void; readonly onPendingChange?: (pending: boolean) => void; }): { ...; }
```
## `UIBuilderHand`

```ts
UIBuilderHand({ editor, toolbarContent, recordSelection }: { readonly editor: ObjectEditor; readonly toolbarContent?: ReactNode; readonly recordSelection?: UIBuilderRecordSelection; }): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `UIComponentInteraction`

```ts
interface UIComponentInteraction {
  readonly busy: boolean;
  readonly selectedItem: number;
  readonly onAction: () => void;
  readonly onValueChange: (value: string | boolean) => void;
  readonly onSelectItem: (index: number) => void;
}
```
## `UIComponentSurface`

```ts
UIComponentSurface({ object, designId, issues, interaction, layout }: UIComponentSurfaceProps): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `UIComponentSurfaceProps`

```ts
interface UIComponentSurfaceProps {
  readonly object: Extract<CanvasObject, {kind: "embedded-document"}>;
  readonly designId?: UIDesignId;
  readonly issues?: readonly string[];
  readonly interaction?: UIComponentInteraction;
  readonly layout?: "absolute" | "flow";
}
```
## `UIComponentView`

```ts
UIComponentView(props: UIComponentSurfaceProps): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `useCanvasHand`

```ts
useCanvasHand(editor: ObjectEditor, style: CanvasCreationStyle, selectProfile?: PlaneSelectProfile, activateEmbedded?: (objectId: string) => void): { setContainerLayout(id: string, layout: ObjectContainerLayout): EditingResult<...>; ... 26 more ...; surfaceProps: { ...; }; }
```
## `useCanvasViewport`

```ts
useCanvasViewport(surface: RefObject<SVGSVGElement | null>, document: CanvasDocument, enabled: boolean, navigation?: "free" | "fixed"): { hand: boolean; setHand: React.Dispatch<React.SetStateAction<boolean>>; ... 8 more ...; events: { ...; } | { ...; }; }
```

## `UIScreenEditBounds`

```ts
interface UIScreenEditBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}
```

## `UIScreenEditLayer`

```ts
UIScreenEditLayer(props: UIScreenEditLayerProps): React.JSX.Element
```

## `UIScreenEditLayerProps`

`useUIScreenEditTranslation(): {readonly x: number; readonly y: number}`은 현재
컴포넌트의 누적 편집 변위를 반환한다. viewport에 렌더링하는 overlay도 같은 변위를
사용하며 부모 transform을 중복 적용하지 않는다.
[오버레이 Usage](/applications/ui-builder?example=catalog&page=catalog%3Acomposition)에서
대화상자를 열고 디자인으로 전환해 기존 Canvas로 이동할 수 있다.

```ts
interface UIScreenEditLayerProps {
  readonly editor: ObjectEditor;
  readonly object: CanvasObject;
  readonly editable: boolean;
  /** 편집 진입 시 측정하고 세션 중 유지하는 실행 화면 좌표. */
  readonly origin?: UIScreenEditBounds;
  readonly children: ReactNode;
}
```

## `UIBuilderScreenControls`

```ts
UIBuilderScreenControls(props: {
  readonly editor: ObjectEditor;
  readonly pageId?: string;
  readonly recordSelection?: UIBuilderRecordSelection;
}): React.JSX.Element
```

## CanvasEditingCommands

`CanvasEditingCommands({editor, objectIds?, onUndo?, onRedo?, onDuplicate?, onRemove?, onResult?})`
은 Canvas 및 UI Builder가 공유하는 편집 명령 표현이다. 기본 명령은 ObjectEditor의
selection/history/Intent를 소비한다. CanvasHand는 기존 gesture 취소와 history 수명
콜백을 주입한다. 별도의 선택 또는 history 모델을 만들지 않는다.

## CanvasHand collisionGroups

`collisionGroups?: readonly ObjectCollisionGroup[]`는 편집 중 충돌 해소 범위를
지정한다. 그룹은 `objectIds`와 `gap`을 가진다. 기존 gesture 미리보기와 commit은
`resolveObjectCollisions`를 공유한다. 지정하지 않으면 기존 자유 배치를 유지한다.
[업무 피드 Usage](/applications/ui-builder?example=issue-feed&new=1)에서 검색창을
같은 열의 필터 위로 이동하거나 높이를 늘리면 주변 요소가 밀린다.

UIComponentSurface의 card 렌더러는 ObjectDocument의 actionCount 계약을 받아
ContentCard의 본문과 actions에 자식을 한 번씩 전달합니다.
record-list의 feed는 제목 외 역할을 실제 명시한 fieldId로만 렌더합니다.
[실제 빌더 Usage](/applications/ui-builder?example=catalog).

record-card는 UIComponentSurface의 collection projection을 기존 InquiryCard/TaskCard/ProductCard/ApprovalCard/ActivityCard/EvidenceCard에 전달합니다. 시각·행동을 Canvas에서 재구현하지 않습니다. [Usage](/applications/ui-builder?example=domain-cards).

UIComponentSurface는 record-card의 보편 어포던스와 실제 checkbox 인디케이터, feed의 대상 아이콘/우선순위/인디케이터 및 group의 관계 간격을 정본 UI API에 연결합니다. [Usage](/applications/ui-builder?example=domain-cards).


### 데이터 표현 어댑터

number-field/Tag/TagGroup/TagPicker/DateRangeDisplay/RecordFacts/CommentComposer는 UI Primitives의 공개 API를 직접 렌더링한다. detail-list의 라벨·값 구조도 RecordFacts를 사용한다. people-picker는 props.people.items의 실제 ID를 보존한다. CommentComposer는 onAppendActivity 결과가 실패하면 초안을 유지하고, 유효한 대상·작성자가 없으면 비활성이다. 모델·검증·기록 추가는 Object Document/Editing이 소유한다. [Usage](/applications/ui-builder?example=catalog).
