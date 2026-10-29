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
## `assertUIComponentProperties`

```ts
assertUIComponentProperties(component: string, value: unknown): void
```
## `assertUIDomainCardMapping`

```ts
assertUIDomainCardMapping(props: Readonly<Record<string, unknown>>, fields: readonly { readonly id: string; readonly type: string; }[], fieldIds: readonly string[]): void
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
  | { readonly kind: "section"; readonly textColor?: string }
  | { readonly kind: "path"; readonly points: ReadonlyArray<ObjectPoint>; readonly strokeWidth: number }
  | { readonly kind: "image"; readonly source: string }
  | { readonly kind: "embedded-document"; readonly documentType: string; readonly document: JSONValue }
);
```
## `CanvasObjectKind`

```ts
type CanvasObjectKind = "text" | "section" | "rectangle" | "ellipse" | "sticky-note" | "path" | "image" | "embedded-document";
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
## `findVacantObjectBounds`

```ts
findVacantObjectBounds(objects: readonly DocumentObject[], requested: ObjectBounds, gap?: number): ObjectBounds
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
## `mapUIComponentChildren`

```ts
mapUIComponentChildren(content: UIComponentContent, map: (id: string) => string | undefined): UIComponentContent
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
## `ObjectCollisionGroup`

```ts
interface ObjectCollisionGroup {
  readonly objectIds: readonly string[];
  readonly gap: number;
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
## `resolveObjectCollisions`

```ts
resolveObjectCollisions(objects: readonly DocumentObject[], groups: readonly ObjectCollisionGroup[], anchoredIds: readonly string[]): readonly DocumentObject[]
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
## `uiBuilderComponentChildIds`

```ts
uiBuilderComponentChildIds(object: UIComponentObject): readonly string[]
```
## `uiComponentAuthoringCatalog`

```ts
const uiComponentAuthoringCatalog: ({ category: string; source: string; mapping: string; defaultProps: Record<string, JSONValue>; propertySchema: Readonly<Record<string, UIComponentPropertyRule>>; ... 8 more ...; description: "Page or section heading"; } | ... 16 more ... | { ...; })[]
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
const uiComponentCatalog: readonly ({ category: string; source: string; mapping: string; defaultProps: Record<string, JSONValue>; propertySchema: Readonly<Record<string, UIComponentPropertyRule>>; ... 8 more ...; description: "Page or section heading"; } | ... 16 more ... | { ...; })[]
```
## `uiComponentCompositionRecipes`

```ts
const uiComponentCompositionRecipes: readonly [{ readonly id: "execution-result"; readonly source: "packages/json-document-ui-primitives-react/src/content-card.tsx"; readonly components: readonly ["card", "text", "button"]; readonly description: "Independent execution result = ContentCard with real result body and optional follow-up actions. ResultPane...
```
## `UIComponentContent`

```ts
type UIComponentContent = Record<string, JSONValue> & {
  readonly props?: Record<string, JSONValue>;
  readonly childIds?: readonly string[];
  readonly collection?: { readonly tableId: string; readonly fieldIds: readonly string[] };
  readonly bindings?: readonly UIComponentBinding[];
  readonly actionId?: string;
  readonly pageId?: string;
  readonly targetPageId?: string;
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
## `UIComponentPropertyRule`

```ts
type UIComponentPropertyRule = { readonly type: "string" | "number" | "boolean" | "strings" | "object" | "files"; readonly enum?: readonly string[] };
```
## `uiComponentSlotIds`

```ts
uiComponentSlotIds(content: UIComponentContent): readonly (string | undefined)[]
```
## `uiDesignCatalog`

```ts
const uiDesignCatalog: readonly [{ readonly id: "clean"; readonly label: "공통"; readonly description: "Shared typography, controls and minimal content hierarchy."; }]
```
## `UIDesignId`

```ts
type UIDesignId = typeof uiDesignCatalog[number]["id"];
```
## `uiDomainCardCatalog`

```ts
const uiDomainCardCatalog: readonly [{ readonly id: "person"; readonly label: "인물"; readonly api: "PersonCard"; readonly purpose: "이름과 역할로 사람을 식별하고 연락 맥락을 확인한다"; readonly required: readonly ["title"]; readonly roles: readonly ["title", "role", "organization", "contact", "status", "identifier"]; readonly reason: "이름·직무·소속은 간격으로 묶고 연락처는 구분선 아래 ...
```
## `uiDomainCardFieldRoles`

```ts
const uiDomainCardFieldRoles: any[]
```
## `UIDomainCardPresentation`

```ts
type UIDomainCardPresentation = typeof uiDomainCardCatalog[number]["id"];
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
