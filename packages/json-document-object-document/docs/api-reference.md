# @interactive-os/json-document-object-document API

**탐색 분류:** Document Types

Object·Canvas 모델·검증·의미 연산·projection의 public entrypoint입니다. API의 owner는 이 package이며 탐색 분류는 저장소의 아키텍처 등록에서 읽는 위치입니다. 별도 subpath 표시가 없는 항목은 package root에서 import합니다. internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-object-document/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `arrangeUIComponents`

```ts
arrangeUIComponents(objects: readonly CanvasObject[], layoutId: UILayoutId, width: number): CanvasObject[]
```
## `assertCanvasDocument`

```ts
assertCanvasDocument(value: unknown): asserts value is CanvasDocument
```
## `assertCanvasImageSource`

```ts
assertCanvasImageSource(source: unknown): asserts source is string
```
## `assertObjectDocument`

```ts
assertObjectDocument(value: unknown): void
```
## `assertObjectStyle`

```ts
assertObjectStyle(value: unknown): asserts value is Partial<ObjectStyle>
```
## `assertUIBuilderDocument`

```ts
assertUIBuilderDocument(value: unknown): asserts value is CanvasDocument
```
## `assertUIComponentBindings`

```ts
assertUIComponentBindings(value: unknown, targets: readonly UIBindingTarget[]): asserts value is readonly UIComponentBinding[]
```
## `assertUIComponentContent`

```ts
assertUIComponentContent(value: unknown): asserts value is UIComponentContent
```
## `assertUIFlowLayout`

```ts
assertUIFlowLayout(value: unknown): asserts value is UIFlowLayout
```
## `CanvasDocument`

```ts
interface CanvasDocument extends ObjectDocument {
  readonly profile: "canvas/1";
  readonly width: number;
  readonly height: number;
  readonly objects: ReadonlyArray<CanvasObject>;
}
```
## `CanvasObject`

```ts
type CanvasObject = CanvasObjectDraft & { readonly id: string };
```
## `CanvasObjectDraft`

```ts
type CanvasObjectDraft = ObjectDraft & { readonly parentId?: string } & (
  | (CanvasTextFormat & { readonly kind: "text"; readonly fontSize: number; readonly widthMode?: "auto" | "fixed" })
  | (CanvasTextFormat & { readonly kind: "rectangle"; readonly containerLayout?: ObjectContainerLayout; readonly textColor?: string; readonly strokeColor?: string; readonly strokeWidth?: number })
  | (CanvasTextFormat & { readonly kind: "ellipse" | "sticky-note"; readonly textColor?: string; readonly strokeColor?: string; readonly strokeWidth?: number })
  | { readonly kind: "path"; readonly points: ReadonlyArray<ObjectPoint>; readonly strokeWidth: number }
  | { readonly kind: "image"; readonly source: string }
  | { readonly kind: "embedded-document"; readonly documentType: string; readonly document: JSONValue }
);
```
## `CanvasObjectKind`

```ts
type CanvasObjectKind = "text" | "rectangle" | "ellipse" | "sticky-note" | "path" | "image" | "embedded-document";
```
## `CanvasTextFormat`

```ts
interface CanvasTextFormat {
  readonly fontSize?: number;
  readonly fontWeight?: 400 | 700;
  readonly textAlign?: "left" | "center" | "right";
}
```
## `createCanvasEmbeddedDocument`

```ts
createCanvasEmbeddedDocument(documentType: string, document: JSONValue, bounds: ObjectBounds, label: string): Extract<CanvasObjectDraft, { kind: "embedded-document"; }>
```
## `createCanvasImage`

```ts
createCanvasImage(image: { readonly source: string; readonly width: number; readonly height: number; readonly label: string; }, bounds: ObjectBounds): Extract<CanvasObjectDraft, { readonly kind: "image"; }>
```
## `createCanvasObject`

```ts
createCanvasObject(kind: Exclude<CanvasObjectKind, "path" | "image" | "embedded-document">, bounds: ObjectBounds, style: { readonly color: string; readonly label: string; readonly fontSize?: number; readonly textColor?: string; }): CanvasObjectDraft
```
## `createCanvasPath`

```ts
createCanvasPath(points: ReadonlyArray<ObjectPoint>, style: { readonly color: string; readonly label: string; readonly strokeWidth: number; }): Extract<CanvasObjectDraft, { readonly kind: "path"; }>
```
## `createUIComponentObject`

```ts
createUIComponentObject(component: UIComponentKind, position: Pick<ObjectBounds, "x" | "y">, content?: Partial<Pick<UIComponentContent, "detail" | "items" | "tone">> & { readonly text?: string; }): CanvasObjectDraft
```
## `defaultObjectContainerPolicy`

```ts
const defaultObjectContainerPolicy: ObjectContainerPolicy
```
## `DocumentObject`

```ts
interface DocumentObject extends ObjectDraft {
  readonly id: string;
}
```
## `getObjectStyle`

```ts
getObjectStyle(object: DocumentObject): Partial<ObjectStyle>
```
## `layoutObjectDocument`

```ts
layoutObjectDocument(document: ObjectDocument, options: ObjectLayoutOptions, previous?: ObjectDocument): ObjectDocument
```
## `layoutObjectText`

```ts
layoutObjectText<Object extends ObjectDraft>(object: Object, measure?: ObjectTextMeasurer): Object
```
## `ObjectBounds`

```ts
interface ObjectBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}
```
## `ObjectContainerLayout`

```ts
type ObjectContainerLayout = {
  readonly direction: "horizontal" | "vertical" | "free";
  readonly gap: number;
  readonly padding: { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number };
}
```
## `ObjectContainerPolicy`

```ts
interface ObjectContainerPolicy { readonly overlapThreshold: number }
```
## `ObjectDocument`

```ts
interface ObjectDocument extends Record<string, JSONValue> {
  readonly objects: ReadonlyArray<DocumentObject>;
}
```
## `ObjectDraft`

```ts
interface ObjectDraft extends ObjectBounds, Record<string, JSONValue> {
  readonly label: string;
  readonly color: string;
}
```
## `ObjectLayoutOptions`

```ts
interface ObjectLayoutOptions {
  readonly measureText?: ObjectTextMeasurer;
  readonly containerPolicy?: ObjectContainerPolicy;
}
```
## `ObjectOperation`

```ts
type ObjectOperation =
  | { readonly type: "update"; readonly objectId: string; readonly changes: Partial<ObjectDraft> }
  | { readonly type: "reorder"; readonly objectIds: ReadonlyArray<string> }
  | { readonly type: "insert"; readonly objects: ReadonlyArray<DocumentObject> }
  | { readonly type: "transform"; readonly objectIds: ReadonlyArray<string>; readonly transform: ObjectTransform }
  | { readonly type: "fill"; readonly objectIds: ReadonlyArray<string>; readonly color: string }
  | { readonly type: "style"; readonly objectIds: ReadonlyArray<string>; readonly style: Partial<ObjectStyle> }
  | { readonly type: "remove"; readonly objectIds: ReadonlyArray<string> }
  | { readonly type: "embedded-document"; readonly objectId: string; readonly document: JSONValue }
  | { readonly type: "text"; readonly objectId: string; readonly text: string }
  | { readonly type: "replace"; readonly document: ObjectDocument };
```
## `ObjectOperationPlan`

```ts
type ObjectOperationPlan =
  | { readonly ok: true; readonly operations: ReadonlyArray<JSONPatchOperation> }
  | { readonly ok: false; readonly code: string; readonly reason?: string };
```
## `ObjectPoint`

```ts
interface ObjectPoint extends Record<string, JSONValue> {
  readonly x: number;
  readonly y: number;
}
```
## `ObjectStyle`

```ts
interface ObjectStyle {
  readonly color: string;
  /** Body text paint for filled objects; standalone text keeps its existing color field. */
  readonly textColor: string;
  readonly fontSize: number;
  readonly fontWeight: 400 | 700;
  readonly textAlign: "left" | "center" | "right";
  readonly strokeColor: string;
  readonly strokeWidth: number;
}
```
## `ObjectStyleSelection`

```ts
type ObjectStyleSelection = { readonly [Key in keyof ObjectStyle]?: ObjectStyle[Key] | null };
```
## `objectSubtreeIds`

```ts
objectSubtreeIds(objects: ReadonlyArray<DocumentObject>, ids: ReadonlyArray<string>): string[]
```
## `ObjectTextMeasurer`

```ts
type ObjectTextMeasurer = (text: ObjectTextProjection) => { readonly width: number; readonly height: number };
```
## `ObjectTextProjection`

```ts
interface ObjectTextProjection extends ObjectBounds, Pick<ObjectStyle, "fontSize" | "fontWeight" | "textAlign" | "color"> {
  readonly widthMode: "auto" | "fixed";
  readonly text: string;
  readonly verticalAlign: "top" | "center";
}
```
## `ObjectTransform`

```ts
interface ObjectTransform {
  readonly dx: number;
  readonly dy: number;
  readonly dw?: number;
  readonly dh?: number;
}
```
## `parseCanvasDocument`

```ts
parseCanvasDocument(json: string): CanvasDocument
```
## `planObjectOperation`

```ts
planObjectOperation(document: ObjectDocument, operation: ObjectOperation, options?: ObjectLayoutOptions): ObjectOperationPlan
```
## `projectObject`

```ts
projectObject(object: DocumentObject): CanvasObject
```
## `projectObjectText`

```ts
projectObjectText(object: DocumentObject): ObjectTextProjection | null
```
## `readObjectStyle`

```ts
readObjectStyle(objects: ReadonlyArray<DocumentObject>): ObjectStyleSelection
```
## `resolveUIFlowLayout`

```ts
resolveUIFlowLayout(objects: readonly CanvasObject[], layout?: UIFlowLayout | null): UIFlowLayout
```
## `serializeCanvasDocument`

```ts
serializeCanvasDocument(document: CanvasDocument): string
```
## `transformObject`

```ts
transformObject<Object extends DocumentObject>(object: Object, transform: ObjectTransform): Object
```
## `uiBindingCatalog`

```ts
const uiBindingCatalog: readonly [{ readonly id: "value"; readonly label: "한 행의 값"; readonly description: "A field from the first row, or a specific record ID."; }, { readonly id: "list"; readonly label: "목록"; readonly description: "A field from all rows, up to 50 visible values."; }, { ...; }, { ...; }]
```
## `UIBindingMode`

```ts
type UIBindingMode = typeof uiBindingCatalog[number]["id"];
```
## `UIBindingTarget`

```ts
type UIBindingTarget = "text" | "detail" | "items" | "value";
```
## `UIComponentBinding`

```ts
interface UIComponentBinding extends Record<string, JSONValue> {
  readonly target: UIBindingTarget;
  readonly mode: UIBindingMode;
  readonly tableId: string;
  readonly fieldId: string;
  readonly recordId: string;
}
```
## `uiComponentCatalog`

```ts
const uiComponentCatalog: readonly [{ readonly id: "heading"; readonly bindingTargets: readonly ["text"]; readonly label: "제목"; readonly width: 440; readonly height: 64; readonly text: "새로운 아이디어"; readonly detail: ""; readonly items: readonly []; readonly description: "Page or section heading"; }, ... 10 more ..., { ...; }]
```
## `UIComponentContent`

```ts
type UIComponentContent = Record<string, JSONValue> & {
  readonly bindings?: readonly UIComponentBinding[];
  readonly actionId?: string;
  readonly value?: string | number | boolean;
  readonly component: UIComponentKind;
  readonly detail: string;
  readonly items: readonly string[];
  readonly tone: "default" | "accent" | "quiet";
}
```
## `uiComponentDocumentType`

```ts
const uiComponentDocumentType: "ui-component/1"
```
## `UIComponentKind`

```ts
type UIComponentKind = typeof uiComponentCatalog[number]["id"];
```
## `UIComponentObject`

```ts
interface UIComponentObject extends ObjectDraft { readonly id: string; readonly kind: "embedded-document"; readonly documentType: string; readonly document: UIComponentContent; }
```
## `uiDesignCatalog`

```ts
const uiDesignCatalog: readonly [{ readonly id: "clean"; readonly label: "공통"; readonly description: "Shared typography, controls and minimal content hierarchy."; }]
```
## `UIDesignId`

```ts
type UIDesignId = typeof uiDesignCatalog[number]["id"];
```
## `UIFlowColumn`

```ts
interface UIFlowColumn extends Record<string, JSONValue> { readonly weight: number; readonly items: readonly UIFlowItem[]; }
```
## `UIFlowItem`

```ts
interface UIFlowItem extends Record<string, JSONValue> { readonly objectId: string; readonly size: "hug" | "fill"; }
```
## `UIFlowLayout`

```ts
interface UIFlowLayout extends Record<string, JSONValue> { readonly rows: readonly UIFlowRow[]; }
```
## `UIFlowRow`

```ts
interface UIFlowRow extends Record<string, JSONValue> { readonly columns: readonly UIFlowColumn[]; }
```
## `uiLayoutCatalog`

```ts
const uiLayoutCatalog: readonly [{ readonly id: "stack"; readonly label: "세로 흐름"; readonly description: "Read top to bottom: headings, copy, forms and content."; }, { readonly id: "grid"; readonly label: "카드 그리드"; readonly description: "Two columns for comparable content; headings span the width."; }, { ...; }]
```
## `UILayoutId`

```ts
type UILayoutId = typeof uiLayoutCatalog[number]["id"];
```

## uiBuilderComponentChildIds

`uiBuilderComponentChildIds(object: UIComponentObject): readonly string[]` — childIds와 shell의 toolbarIds/inspectorIds 참조를 반환한다. 일반 object subtree 연산과 UI 조합은 같은 참조 계약을 소비한다.

## resolveObjectCollisions

`resolveObjectCollisions(objects, groups: readonly ObjectCollisionGroup[], anchoredIds)`
returns geometry with intersecting siblings pushed downward. Each group supplies
`objectIds` and a nonnegative `gap`. Gesture anchors retain their positions; displaced
compositions translate with their canonical subtrees. Unrelated groups and document
content are unchanged. The function owns geometry only, not gestures or history.
[UI Builder Usage](/applications/ui-builder?example=issue-feed&new=1) consumes it through
`CanvasHand.collisionGroups` for both live preview and a single committed Undo unit.

## Product record catalog

`uiComponentCatalog` includes `status-badge`, `property-editor`, `result-panel`, and attached/floating `product-inspector`. Record list role props map title/summary/identifier/status/assignee/updatedAt fields. See [UI component contract](ui-component.md#product-record-roles).

## Expanded product vocabulary

`uiComponentCatalog`에 page-header/sidebar-navigation/avatar/person-identity/priority-indicator/date-display/empty-state/inline-alert/stepper/activity-feed/people-picker/filter-bar가 등록됐습니다. [공개 문서의 매핑](ui-component.md#additional-product-catalog)과 [통합 Usage](/demo/ui-primitives#design-system-product-workflow)를 참고하세요.

## uiComponentSlotIds / mapUIComponentChildren

```ts
uiComponentSlotIds(content: UIComponentContent): readonly (string | undefined)[]
mapUIComponentChildren(content: UIComponentContent, map: (id: string) => string | undefined): UIComponentContent
```

이름으로 연결한 작업 공간의 영역을 읽고, 복제/삭제에서 자식 참조를 변환한다. map이 undefined를 반환하면 해당 참조를 제거한다. 자세한 계약은 [UI Component](ui-component.md#작업-공간의-이름-참조)에 있다.

### `card.props.actionCount`

`card`의 childIds 끝 actionCount개를 ContentCard.actions에, 나머지를 본문에
전달합니다. 기본은 0입니다. [계약](ui-component.md#그룹의-표면-선택)과
[전체 빌더 Usage](/applications/ui-builder?example=catalog)에서 본문과 실제 페이지
이동 행동을 확인할 수 있습니다. group/card/feed/inspector 선택은 같은 카탈로그의
content-surface-choice recipe에 등록되어 있습니다.

## `uiDomainCardCatalog` / `assertUIDomainCardMapping`

```ts
type UIDomainCardPresentation = "inquiry" | "task" | "product" | "approval" | "activity" | "result";
assertUIDomainCardMapping(props: Readonly<Record<string, unknown>>, fields: readonly {id:string;type:string}[], fieldIds: readonly string[]): void;
```

`uiDomainCardCatalog`의 required/roles/purpose/reason과 `uiDomainCardFieldRoles`는
같은 정본이며 props 스키마와 에이전트 조합 recipe에 함께 사용합니다.
[계약](ui-component.md#선택-레코드의-도메인-카드),
[Usage](/applications/ui-builder?example=domain-cards).

record-card의 unread/completed/overdue/changedFieldId는 checkbox 사실, approval의
before/afterFieldId는 실제 비교값입니다. record-list.itemKind/priorityFieldId와
checkbox 인디케이터, group.relationship(related/group/region)도 정본 스키마에
등록되어 있습니다. [계약](ui-component.md#경계와-상태-단서),
[Usage](/applications/ui-builder?example=domain-cards).


### 작성용 UI 카탈로그

`uiComponentAuthoringCatalog`는 uiComponentCatalog에서 aliasOf가 있는 호환 ID를 제외한 파생 목록이다. 팔레트·신규 화면 생성·전체 컴포넌트 Usage는 이 목록을 사용한다. 저장된 문서 검증은 uiComponentCatalog 전체로 수행하므로 property-editor/result-panel의 기존 ID는 유효하다. aliasOf는 각각 record-facts/card를 가리킨다. [Usage](/applications/ui-builder?example=catalog), 소스 `src/ui-component-catalog.ts`.
