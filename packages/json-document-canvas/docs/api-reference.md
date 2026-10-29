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
## `CanvasEditingCommands`

```ts
CanvasEditingCommands({ editor, objectIds, onUndo, onRedo, onDuplicate, onRemove, onResult }: { readonly editor: ObjectEditor; readonly objectIds?: readonly string[] | undefined; readonly onUndo?: () => void; readonly onRedo?: () => void; readonly onDuplicate?: () => void; readonly onRemove?: () => void; readonly onResult?: (result: { readonly ok: boolean; }) => void; }): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `CanvasEditTarget`

```ts
interface CanvasEditTarget {
  readonly objectIds: readonly string[];
  readonly nodeId?: string;
  readonly label: string;
}
```
## `CanvasHand`

```ts
CanvasHand(props: CanvasHandProps): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `CanvasHandProps`

```ts
interface CanvasHandProps {
  readonly onRequestEdit?: (target: CanvasEditTarget) => void;
  /** Fill the host and navigate independently of document coordinates. */
  readonly workspace?: boolean;
  readonly collisionGroups?: readonly import("@interactive-os/json-document-object-document").ObjectCollisionGroup[];
  /** Use the same Canvas interaction surface over mounted HTML content. */
  readonly screenOverlay?: {
    readonly width: number;
    readonly height: number;
    readonly onObjectsChange: (objects: readonly import("@interactive-os/json-document-object-document").CanvasObject[]) => void;
  };
  /** Pixel-sized workspace with scrolling, without zoom or fit controls. */
  readonly navigation?: "free" | "fixed";
  readonly onViewportChange?: (bounds: import("@interactive-os/json-document-object-document").ObjectBounds) => void;
  readonly creationTools?: readonly CanvasTool[];
  readonly toolbarContent?: ReactNode;
  readonly documentControls?: boolean;
  readonly contentToolbar?: boolean;
  /** Limit visible/selectable objects while retaining the full editor document. */
  readonly objectIds?: readonly string[];
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
## `CanvasHTMLObject`

```ts
CanvasHTMLObject({ object, editor, active, onDeactivate, onRequestEdit, geometryKey, review }: { readonly object: Extract<CanvasObject, { kind: "embedded-document"; }>; readonly editor: ObjectEditor; readonly geometryKey?: string; readonly review?: { readonly requests: readonly WebHTMLReviewRequest[]; readonly onRegions: (regions: Record<string, WebHTMLReviewRegion[]>) => void; }; readonly active: boolean; readonly onDeactivate: () => void; readonly onRequestEdit?: (target: CanvasEditTarget) => void; }): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `CanvasPages`

```ts
CanvasPages({ editor, selectedId, onSelect, onRequestEdit }: { readonly editor: ObjectEditor; readonly selectedId: string | null; readonly onSelect: (id: string) => void; readonly onRequestEdit: (target: CanvasEditTarget) => void; }): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `CanvasSection`

```ts
CanvasSection({ object, hideTitle }: { readonly object: Extract<CanvasObject, { kind: "section"; }>; readonly hideTitle?: boolean; }): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
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
## `UIBuilderScreenControls`

```ts
UIBuilderScreenControls({ editor, pageId, commands, contentEditing, onContentEditingChange }: { readonly editor: ObjectEditor; readonly pageId?: string; readonly commands?: boolean; readonly contentEditing?: boolean; readonly onContentEditingChange?: (open: boolean) => void; readonly recordSelection?: UIBuilderRecordSelection; }): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `UIComponentInteraction`

```ts
interface UIComponentInteraction {
  readonly editing?: boolean | undefined;
  readonly dismissBoundary?: RefObject<HTMLElement | null> | undefined;
  readonly busy: boolean;
  readonly actionUnavailableReason?: string | undefined;
  readonly selectedItem: number;
  readonly recordIdentity?: string | undefined;
  readonly onAction: (actionId?: string) => void;
  readonly onNavigate: (pageId: string) => void;
  readonly onPropsChange: (patch: Record<string, JSONValue>) => void;
  readonly onSelectRecord: (recordId: string) => void;
  readonly onCollectionChange: (document: DatabaseDocument) => void;
  readonly onItemAction?: ((index: number) => void) | undefined;
  readonly onResize?: ((delta: number, phase: "preview" | "commit") => void) | undefined;
  readonly onHandle?: ((event: InteractionHandleEvent) => void) | undefined;
  readonly onFiles?: ((files: readonly File[]) => void) | undefined;
  readonly onAppendActivity?: ((text:string) => boolean | void) | undefined;
  readonly onValueChange: (value: string | number | boolean) => boolean | void;
  readonly onSelectItem: (index: number) => void;
}
```
## `UIComponentSurface`

```ts
UIComponentSurface({ object, designId, issues, interaction, inert, layout, renderChildren, collection }: UIComponentSurfaceProps): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `UIComponentSurfaceProps`

```ts
interface UIComponentSurfaceProps {
  readonly object: Extract<CanvasObject, {kind: "embedded-document"}>;
  readonly designId?: UIDesignId;
  readonly issues?: readonly string[];
  readonly interaction?: UIComponentInteraction | undefined;
  /** Keep visual state while removing runtime controls from editing focus/input. */
  readonly inert?: boolean;
  readonly layout?: "absolute" | "flow";
  readonly renderChildren?: ((ids: readonly string[]) => ReactNode) | undefined;
  readonly collection?: UIBuilderCollectionProjection | undefined;
}
```
## `UIComponentView`

```ts
UIComponentView(props: UIComponentSurfaceProps): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
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
UIScreenEditLayer({ object, editable, origin, children }: UIScreenEditLayerProps): import("<repository>/node_modules/@types/react/jsx-runtime").JSX.Element
```
## `UIScreenEditLayerProps`

```ts
interface UIScreenEditLayerProps {
  readonly editor: ObjectEditor;
  readonly object: CanvasObject;
  readonly editable: boolean;
  /** Measured runtime geometry at entry; stable throughout this edit session. */
  readonly origin?: UIScreenEditBounds | undefined;
  readonly children: ReactNode;
}
```
## `useCanvasHand`

```ts
useCanvasHand(editor: ObjectEditor, style: CanvasCreationStyle, selectProfile?: PlaneSelectProfile, activateEmbedded?: (objectId: string) => void, objectIds?: readonly string[], collisionGroups?: readonly ObjectCollisionGroup[]): { ...; }
```
## `useCanvasViewport`

```ts
useCanvasViewport(surface: RefObject<SVGSVGElement | null>, document: CanvasDocument, enabled: boolean, navigation?: "free" | "fixed"): { hand: boolean; setHand: React.Dispatch<React.SetStateAction<boolean>>; ... 8 more ...; events: { ...; } | { ...; }; }
```
## `useUIScreenEditTranslation`

```ts
useUIScreenEditTranslation(): { readonly x: number; readonly y: number; }
```
