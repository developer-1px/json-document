# @interactive-os/json-document-editing API

**Owner:** Editing

intent, editor, history 편집 계약의 public entrypoint입니다. 아래 항목은 package root에서 import할 수 있는 안정된 public API이며 internal 경로는 계약이 아닙니다.

> 이 문서는 `packages/json-document-editing/src/index.ts`에서 생성됩니다. API를 변경한 뒤 `npm run docs:api`를 실행하세요.

## `Annotation`

```ts
interface Annotation extends Record<string, JSONValue> { readonly id: string; readonly body: { readonly instruction: string }; readonly target: { readonly sourceId: string; readonly selector: AnnotationSelector }; readonly presentation: AnnotationPresentation }
```
## `ANNOTATION_PROFILE_V1`

```ts
const ANNOTATION_PROFILE_V1: "urn:interactive-os:json-document:annotation:1"
```
## `AnnotationDocument`

```ts
interface AnnotationDocument extends Record<string, JSONValue> { readonly profile: typeof ANNOTATION_PROFILE_V1; readonly id: string; readonly sources: ReadonlyArray<AnnotationSource>; readonly annotations: ReadonlyArray<Annotation> }
```
## `AnnotationEditor`

```ts
interface AnnotationEditor { readonly snapshot: EditingSnapshot<AnnotationSelection>; dispatch(intent: AnnotationIntent): EditingResult<AnnotationSelection>; undo(): EditingResult<AnnotationSelection>; redo(): EditingResult<AnnotationSelection>; subscribe(listener: () => void): () => void }
```
## `AnnotationIntent`

```ts
type AnnotationIntent =
  | { readonly type: "selection.set"; readonly annotationId: string | null; readonly mode: "replace" | "toggle" }
  | { readonly type: "annotation.create"; readonly annotation: Annotation }
  | { readonly type: "annotation.body.set"; readonly annotationId: string; readonly instruction: string }
  | { readonly type: "annotation.move"; readonly annotationId: string; readonly dx: number; readonly dy: number }
  | { readonly type: "annotation.resize"; readonly annotationId: string; readonly handle: "end" | "south-east"; readonly dx: number; readonly dy: number }
  | { readonly type: "annotation.delete"; readonly annotationId: string };
```
## `AnnotationPoint`

```ts
interface AnnotationPoint extends Record<string, JSONValue> { readonly x: number; readonly y: number }
```
## `AnnotationPresentation`

```ts
type AnnotationPresentation =
  | { readonly type: "marker" }
  | { readonly type: "outline" }
  | { readonly type: "stroke" }
  | { readonly type: "arrow" };
```
## `AnnotationSelection`

```ts
interface AnnotationSelection extends Record<string, JSONValue> { readonly kind: "annotation"; readonly ids: ReadonlyArray<string>; readonly primaryId: string | null }
```
## `AnnotationSelector`

```ts
type AnnotationSelector =
  | ({ readonly type: "point" } & AnnotationPoint)
  | ({ readonly type: "rectangle"; readonly width: number; readonly height: number } & AnnotationPoint)
  | { readonly type: "path"; readonly points: ReadonlyArray<AnnotationPoint> }
  | { readonly type: "arrow"; readonly from: AnnotationPoint; readonly to: AnnotationPoint };
```
## `AnnotationSource`

```ts
interface AnnotationSource extends Record<string, JSONValue> { readonly id: string; readonly src: string; readonly width: number; readonly height: number }
```
## `assertAnnotationDocument`

```ts
assertAnnotationDocument(document: AnnotationDocument): void
```
## `BlockDocument`

```ts
interface BlockDocument extends Record<string, JSONValue> {
  readonly blocks: ReadonlyArray<DocumentBlock>;
}
```
## `createAnnotationEditor`

```ts
createAnnotationEditor(source: EditingDocumentSource<AnnotationDocument>): AnnotationEditor
```
## `createDatabaseEditor`

```ts
createDatabaseEditor(source: EditingDocumentSource<DatabaseDocument>): DatabaseEditor
```
## `createDocumentEditor`

```ts
createDocumentEditor(source: EditingDocumentSource<BlockDocument>, options?: { readonly createId?: () => string; }): DocumentEditor
```
## `createEditingSession`

```ts
createEditingSession<Selection extends JSONValue>(options: { readonly document: JSONDocument; readonly selection: Selection; }): EditingSession<Selection>
```
## `createKanbanEditor`

```ts
createKanbanEditor(source: EditingDocumentSource<KanbanDocument>): KanbanEditor
```
## `createObjectEditor`

```ts
createObjectEditor(source: EditingDocumentSource<ObjectDocument>, options?: { readonly createId?: () => string; }): ObjectEditor
```
## `createOrderEditor`

```ts
createOrderEditor(source: EditingDocumentSource<OrderDocument>, options?: { readonly createId?: () => string; }): OrderEditor
```
## `createSheetEditor`

```ts
createSheetEditor(source: EditingDocumentSource<SheetDocument>): SheetEditor
```
## `createTreeEditor`

```ts
createTreeEditor(source: EditingDocumentSource<TreeDocument>, options?: { readonly createId?: () => string; }): TreeEditor
```
## `DatabaseCell`

```ts
interface DatabaseCell extends DatabasePoint {
  readonly value: JSONValue;
}
```
## `DatabaseClipboard`

```ts
interface DatabaseClipboard extends Record<string, JSONValue> {
  readonly type: "application/vnd.interactive-os.database+json";
  readonly cells: ReadonlyArray<ReadonlyArray<JSONValue>>;
  readonly text: string;
}
```
## `DatabaseDocument`

```ts
interface DatabaseDocument extends Record<string, JSONValue> {
  readonly schema: {
    readonly properties: ReadonlyArray<DatabaseProperty>;
  };
  readonly records: ReadonlyArray<DatabaseRecord>;
  readonly views: ReadonlyArray<DatabaseTableView>;
}
```
## `DatabaseEditor`

```ts
interface DatabaseEditor {
  readonly snapshot: EditingSnapshot<DatabaseSelection>;
  dispatch(intent: DatabaseIntent): EditingResult<DatabaseSelection>;
  tableTopology(viewId: string): DatabaseTopology;
  selectedCellsIn(topology: DatabaseTopology): ReadonlyArray<DatabaseCell>;
  copy(topology?: DatabaseTopology): DatabaseClipboard | null;
  undo(): EditingResult<DatabaseSelection>;
  redo(): EditingResult<DatabaseSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<DatabaseSelection>) => void): () => void;
}
```
## `DatabaseFilter`

```ts
interface DatabaseFilter extends Record<string, JSONValue> {
  readonly propertyId: string;
  readonly operator: "equals";
  readonly value: JSONValue;
}
```
## `DatabaseIntent`

```ts
type DatabaseIntent =
  | {
      readonly type: "selection.set";
      readonly recordId: string;
      readonly propertyId: string;
      readonly mode?: "replace" | "extend" | "toggle";
    }
  | {
      readonly type: "cell.commit";
      readonly recordId: string;
      readonly propertyId: string;
      readonly value: JSONValue;
    }
  | {
      readonly type: "record.add";
      readonly recordId: string;
      readonly values?: Readonly<Record<string, JSONValue>>;
    }
  | {
      readonly type: "record.delete";
      readonly recordId: string;
    }
  | {
      readonly type: "view.configure";
      readonly viewId: string;
      readonly propertyOrder?: ReadonlyArray<string>;
      readonly propertyVisibility?: Readonly<Record<string, boolean>>;
      readonly propertyWidths?: Readonly<Record<string, number>>;
      readonly sort?: DatabaseSort | null;
      readonly filter?: DatabaseFilter | null;
    }
  | {
      readonly type: "clipboard.paste";
      readonly clipboard: DatabaseClipboard;
      readonly topology?: DatabaseTopology;
    };
```
## `DatabasePoint`

```ts
interface DatabasePoint extends Record<string, JSONValue> {
  readonly recordId: string;
  readonly propertyId: string;
}
```
## `DatabaseProperty`

```ts
interface DatabaseProperty extends Record<string, JSONValue> {
  readonly id: string;
  readonly name: string;
  readonly type: DatabasePropertyType;
  readonly options: ReadonlyArray<DatabaseSelectOption>;
}
```
## `DatabasePropertyType`

```ts
type DatabasePropertyType = "title" | "text" | "number" | "select" | "checkbox";
```
## `DatabaseRange`

```ts
interface DatabaseRange extends Record<string, JSONValue> {
  readonly anchor: DatabasePoint;
  readonly focus: DatabasePoint;
}
```
## `DatabaseRecord`

```ts
interface DatabaseRecord extends Record<string, JSONValue> {
  readonly id: string;
  readonly values: Readonly<Record<string, JSONValue>>;
}
```
## `DatabaseSelection`

```ts
interface DatabaseSelection extends Record<string, JSONValue> {
  readonly kind: "range";
  readonly anchor: DatabasePoint | null;
  readonly focus: DatabasePoint | null;
  readonly ranges: ReadonlyArray<DatabaseRange>;
  readonly primaryIndex: number | null;
}
```
## `DatabaseSelectOption`

```ts
interface DatabaseSelectOption extends Record<string, JSONValue> {
  readonly id: string;
  readonly name: string;
}
```
## `DatabaseSort`

```ts
interface DatabaseSort extends Record<string, JSONValue> {
  readonly propertyId: string;
  readonly direction: "ascending" | "descending";
}
```
## `DatabaseTableView`

```ts
interface DatabaseTableView extends Record<string, JSONValue> {
  readonly id: string;
  readonly name: string;
  readonly type: "table";
  readonly propertyOrder: ReadonlyArray<string>;
  readonly propertyVisibility: Readonly<Record<string, boolean>>;
  readonly propertyWidths: Readonly<Record<string, number>>;
  readonly sort: DatabaseSort | null;
  readonly filter: DatabaseFilter | null;
}
```
## `DatabaseTopology`

```ts
interface DatabaseTopology {
  readonly recordIds: ReadonlyArray<string>;
  readonly propertyIds: ReadonlyArray<string>;
}
```
## `DocumentBlock`

```ts
interface DocumentBlock extends Record<string, JSONValue> {
  readonly id: string;
  readonly text: string;
}
```
## `DocumentClipboard`

```ts
interface DocumentClipboard extends Record<string, JSONValue> {
  readonly type: "application/vnd.interactive-os.blocks+json";
  readonly blocks: ReadonlyArray<DocumentBlock>;
  readonly text: string;
}
```
## `DocumentEditor`

```ts
interface DocumentEditor {
  readonly snapshot: EditingSnapshot<DocumentSelection>;
  readonly selectedBlockIds: ReadonlyArray<string>;
  dispatch(intent: DocumentIntent): EditingResult<DocumentSelection>;
  copy(): DocumentClipboard | null;
  cut(): { readonly clipboard: DocumentClipboard; readonly result: EditingResult<DocumentSelection> } | null;
  undo(): EditingResult<DocumentSelection>;
  redo(): EditingResult<DocumentSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<DocumentSelection>) => void): () => void;
}
```
## `DocumentIntent`

```ts
type DocumentIntent =
  | { readonly type: "selection.set"; readonly blockId: string; readonly mode?: "replace" | "extend" | "toggle"; readonly offset?: number }
  | { readonly type: "text.replace"; readonly blockId: string; readonly text: string; readonly offset?: number }
  | { readonly type: "block.insert"; readonly afterId?: string; readonly text?: string }
  | { readonly type: "selection.remove" }
  | { readonly type: "selection.move"; readonly direction: -1 | 1 }
  | { readonly type: "selection.duplicate" }
  | { readonly type: "clipboard.paste"; readonly clipboard: DocumentClipboard; readonly afterId?: string };
```
## `DocumentObject`

```ts
interface DocumentObject extends Record<string, JSONValue> {
  readonly id: string;
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly color: string;
}
```
## `DocumentPoint`

```ts
interface DocumentPoint extends Record<string, JSONValue> {
  readonly blockId: string;
  readonly offset: number;
}
```
## `DocumentRange`

```ts
interface DocumentRange extends Record<string, JSONValue> {
  readonly anchor: DocumentPoint;
  readonly focus: DocumentPoint;
}
```
## `DocumentSelection`

```ts
interface DocumentSelection extends Record<string, JSONValue> {
  readonly kind: "range";
  readonly ranges: ReadonlyArray<DocumentRange>;
  readonly primaryIndex: number | null;
}
```
## `documentSelectionFocus`

```ts
documentSelectionFocus(selection: DocumentSelection): DocumentPoint | null
```
## `EditingDispatch`

```ts
interface EditingDispatch<Intent extends EditingIntent, Selection extends JSONValue> {
  dispatch(intent: Intent): EditingResult<Selection>;
}
```
## `EditingIntent`

```ts
interface EditingIntent {
  readonly type: string;
}
```
## `EditingPlan`

```ts
interface EditingPlan<Selection extends JSONValue> {
  readonly operations: ReadonlyArray<JSONPatchOperation>;
  readonly selectionAfter: Selection;
  readonly origin: string;
  readonly history?: "record" | "ignore";
  readonly historyGroup?: string;
}
```
## `EditingResult`

```ts
type EditingResult<Selection extends JSONValue> =
  | { readonly ok: true; readonly snapshot: EditingSnapshot<Selection>; readonly change?: JSONAppliedChange }
  | { readonly ok: false; readonly code: string; readonly reason?: string };
```
## `EditingSession`

```ts
interface EditingSession<Selection extends JSONValue> {
  readonly snapshot: EditingSnapshot<Selection>;
  apply(plan: EditingPlan<Selection>): EditingResult<Selection>;
  select(selection: Selection): EditingSnapshot<Selection>;
  reconcile(reconciler: (selection: Selection, value: JSONValue) => Selection): EditingSnapshot<Selection>;
  undo(): EditingResult<Selection>;
  redo(): EditingResult<Selection>;
  subscribe(listener: (snapshot: EditingSnapshot<Selection>) => void): () => void;
}
```
## `EditingSnapshot`

```ts
interface EditingSnapshot<Selection extends JSONValue> {
  readonly value: JSONValue;
  readonly selection: Selection;
  readonly revision: number;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}
```
## `gridCellsInRange`

```ts
gridCellsInRange(topology: GridTopology, range: { readonly anchor: GridPoint; readonly focus: GridPoint; }): ReadonlyArray<GridPoint>
```
## `GridPoint`

```ts
interface GridPoint {
  readonly rowId: string;
  readonly columnId: string;
}
```
## `gridPointFromKey`

```ts
gridPointFromKey(key: string): GridPoint | null
```
## `gridPointIndex`

```ts
gridPointIndex(topology: GridTopology, point: GridPoint): { readonly rowIndex: number; readonly columnIndex: number; } | null
```
## `gridPointKey`

```ts
gridPointKey(point: GridPoint): string
```
## `gridRangeBounds`

```ts
gridRangeBounds(topology: GridTopology, range: { readonly anchor: GridPoint; readonly focus: GridPoint; }): GridRangeBounds | null
```
## `GridRangeBounds`

```ts
interface GridRangeBounds {
  readonly rowStart: number;
  readonly rowEnd: number;
  readonly columnStart: number;
  readonly columnEnd: number;
}
```
## `gridTopology`

```ts
gridTopology(rowIds: ReadonlyArray<string>, columnIds: ReadonlyArray<string>): GridTopology
```
## `GridTopology`

```ts
interface GridTopology {
  readonly rowIds: ReadonlyArray<string>;
  readonly columnIds: ReadonlyArray<string>;
}
```
## `jsonCellText`

```ts
jsonCellText(value: JSONValue | undefined): string
```
## `KanbanCard`

```ts
interface KanbanCard extends Record<string, JSONValue> {
  readonly id: string;
  readonly title: string;
}
```
## `KanbanCardDropTarget`

```ts
interface KanbanCardDropTarget {
  readonly columnId: string;
  readonly beforeCardId: string | null;
}
```
## `KanbanColumn`

```ts
interface KanbanColumn extends Record<string, JSONValue> {
  readonly id: string;
  readonly title: string;
  readonly cardIds: ReadonlyArray<string>;
}
```
## `KanbanDocument`

```ts
interface KanbanDocument extends Record<string, JSONValue> {
  readonly columns: ReadonlyArray<KanbanColumn>;
  readonly cards: ReadonlyArray<KanbanCard>;
}
```
## `KanbanEditor`

```ts
interface KanbanEditor {
  readonly snapshot: EditingSnapshot<KanbanSelection>;
  readonly selectedCardIds: ReadonlyArray<string>;
  dispatch(intent: KanbanIntent): EditingResult<KanbanSelection>;
  undo(): EditingResult<KanbanSelection>;
  redo(): EditingResult<KanbanSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<KanbanSelection>) => void): () => void;
}
```
## `KanbanIntent`

```ts
type KanbanIntent =
  | {
      readonly type: "selection.set";
      readonly cardId: string;
      readonly mode?: "replace" | "toggle";
    }
  | ({
      readonly type: "card.move";
      readonly cardId: string;
    } & KanbanCardDropTarget)
  | { readonly type: "selection.remove" };
```
## `KanbanSelection`

```ts
interface KanbanSelection extends Record<string, JSONValue> {
  readonly kind: "explicit";
  readonly keys: ReadonlyArray<string>;
  readonly primaryKey: string | null;
}
```
## `lineInterval`

```ts
lineInterval(topology: LineTopology, anchorId: string, focusId: string): ReadonlyArray<string>
```
## `lineTopology`

```ts
lineTopology(ids: ReadonlyArray<string>): LineTopology
```
## `LineTopology`

```ts
interface LineTopology {
  readonly ids: ReadonlyArray<string>;
}
```
## `nextDatabasePropertySort`

```ts
nextDatabasePropertySort(sort: DatabaseSort | null, propertyId: string): DatabaseSort | null
```
## `ObjectClipboard`

```ts
interface ObjectClipboard extends Record<string, JSONValue> {
  readonly type: "application/vnd.interactive-os.objects+json";
  readonly objects: ReadonlyArray<DocumentObject>;
  readonly text: string;
}
```
## `ObjectDocument`

```ts
interface ObjectDocument extends Record<string, JSONValue> {
  readonly objects: ReadonlyArray<DocumentObject>;
}
```
## `ObjectEditor`

```ts
interface ObjectEditor {
  readonly snapshot: EditingSnapshot<ObjectSelection>;
  readonly selectedObjects: ReadonlyArray<DocumentObject>;
  dispatch(intent: ObjectIntent): EditingResult<ObjectSelection>;
  copy(): ObjectClipboard | null;
  cut(): { readonly clipboard: ObjectClipboard; readonly result: EditingResult<ObjectSelection> } | null;
  undo(): EditingResult<ObjectSelection>;
  redo(): EditingResult<ObjectSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<ObjectSelection>) => void): () => void;
}
```
## `ObjectIntent`

```ts
type ObjectIntent =
  | {
      readonly type: "selection.set";
      readonly objectIds: ReadonlyArray<string>;
      readonly mode?: ObjectSelectionMode;
    }
  | { readonly type: "selection.remove" }
  | { readonly type: "selection.fill"; readonly color: string }
  | {
      readonly type: "object.translate";
      readonly objectIds: ReadonlyArray<string>;
      readonly dx: number;
      readonly dy: number;
    }
  | {
      readonly type: "object.resize";
      readonly objectIds: ReadonlyArray<string>;
      readonly dx: number;
      readonly dy: number;
      readonly dw: number;
      readonly dh: number;
    }
  | { readonly type: "clipboard.paste"; readonly clipboard: ObjectClipboard; readonly placement?: ObjectPastePlacement };
```
## `ObjectPastePlacement`

```ts
interface ObjectPastePlacement {
  readonly type: "offset";
  readonly dx: number;
  readonly dy: number;
}
```
## `ObjectSelection`

```ts
interface ObjectSelection extends Record<string, JSONValue> {
  readonly kind: "explicit";
  readonly keys: ReadonlyArray<string>;
  readonly primaryKey: string | null;
}
```
## `ObjectSelectionMode`

```ts
type ObjectSelectionMode = "replace" | "extend" | "add" | "subtract" | "toggle";
```
## `OrderClipboard`

```ts
interface OrderClipboard extends Record<string, JSONValue> {
  readonly type: "application/vnd.interactive-os.order+json";
  readonly items: ReadonlyArray<OrderItem>;
  readonly text: string;
}
```
## `OrderDocument`

```ts
interface OrderDocument extends Record<string, JSONValue> {
  readonly items: ReadonlyArray<OrderItem>;
}
```
## `OrderEditor`

```ts
interface OrderEditor {
  readonly snapshot: EditingSnapshot<OrderSelection>;
  readonly selectedItemIds: ReadonlyArray<string>;
  dispatch(intent: OrderIntent): EditingResult<OrderSelection>;
  copy(): OrderClipboard | null;
  cut(): { readonly clipboard: OrderClipboard; readonly result: EditingResult<OrderSelection> } | null;
  undo(): EditingResult<OrderSelection>;
  redo(): EditingResult<OrderSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<OrderSelection>) => void): () => void;
}
```
## `OrderIntent`

```ts
type OrderIntent =
  | {
      readonly type: "selection.set";
      readonly itemId: string;
      readonly mode?: "replace" | "extend" | "toggle";
    }
  | { readonly type: "selection.remove" }
  | { readonly type: "item.rename"; readonly itemId: string; readonly label: string }
  | { readonly type: "clipboard.paste"; readonly clipboard: OrderClipboard; readonly afterId?: string };
```
## `OrderItem`

```ts
interface OrderItem extends Record<string, JSONValue> {
  readonly id: string;
  readonly label: string;
}
```
## `OrderPoint`

```ts
interface OrderPoint extends Record<string, JSONValue> {
  readonly itemId: string;
}
```
## `OrderRange`

```ts
interface OrderRange extends Record<string, JSONValue> {
  readonly anchor: OrderPoint;
  readonly focus: OrderPoint;
}
```
## `OrderSelection`

```ts
interface OrderSelection extends Record<string, JSONValue> {
  readonly kind: "range";
  readonly ranges: ReadonlyArray<OrderRange>;
  readonly primaryIndex: number | null;
}
```
## `projectTreeVisibility`

```ts
projectTreeVisibility(nodes: ReadonlyArray<TreeNode>, expandedIds: ReadonlySet<string>): TreeVisibility
```
## `SheetCell`

```ts
interface SheetCell extends SheetPoint {
  readonly value: JSONValue;
}
```
## `SheetClipboard`

```ts
interface SheetClipboard extends Record<string, JSONValue> {
  readonly type: "application/vnd.interactive-os.sheet+json";
  readonly cells: ReadonlyArray<ReadonlyArray<JSONValue>>;
  readonly text: string;
}
```
## `SheetColumn`

```ts
interface SheetColumn extends Record<string, JSONValue> {
  readonly id: string;
  readonly label: string;
}
```
## `SheetDocument`

```ts
interface SheetDocument extends Record<string, JSONValue> {
  readonly columns: ReadonlyArray<SheetColumn>;
  readonly rows: ReadonlyArray<SheetRow>;
}
```
## `SheetEditor`

```ts
interface SheetEditor {
  readonly snapshot: EditingSnapshot<SheetSelection>;
  readonly selectedCells: ReadonlyArray<SheetCell>;
  selectedCellsIn(topology: SheetTopology): ReadonlyArray<SheetCell>;
  dispatch(intent: SheetIntent): EditingResult<SheetSelection>;
  copy(topology?: SheetTopology): SheetClipboard | null;
  cut(topology?: SheetTopology): { readonly clipboard: SheetClipboard; readonly result: EditingResult<SheetSelection> } | null;
  undo(): EditingResult<SheetSelection>;
  redo(): EditingResult<SheetSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<SheetSelection>) => void): () => void;
}
```
## `SheetIntent`

```ts
type SheetIntent =
  | {
      readonly type: "selection.set";
      readonly rowId: string;
      readonly columnId: string;
      readonly mode?: "replace" | "extend" | "toggle";
    }
  | {
      readonly type: "selection.fill";
      readonly value: JSONValue;
      readonly topology?: SheetTopology;
    }
  | {
      readonly type: "cell.commit";
      readonly rowId: string;
      readonly columnId: string;
      readonly value: JSONValue;
    }
  | {
      readonly type: "clipboard.paste";
      readonly clipboard: SheetClipboard;
      readonly topology?: SheetTopology;
    };
```
## `SheetPoint`

```ts
interface SheetPoint extends Record<string, JSONValue> {
  readonly rowId: string;
  readonly columnId: string;
}
```
## `SheetRange`

```ts
interface SheetRange extends Record<string, JSONValue> {
  readonly anchor: SheetPoint;
  readonly focus: SheetPoint;
}
```
## `SheetRow`

```ts
interface SheetRow extends Record<string, JSONValue> {
  readonly id: string;
  readonly cells: Readonly<Record<string, JSONValue>>;
}
```
## `SheetSelection`

```ts
interface SheetSelection extends Record<string, JSONValue> {
  readonly kind: "range";
  /** Primary range aliases retained for single-range consumers. */
  readonly anchor: SheetPoint | null;
  readonly focus: SheetPoint | null;
  readonly ranges: ReadonlyArray<SheetRange>;
  readonly primaryIndex: number | null;
}
```
## `SheetTopology`

```ts
type SheetTopology = GridTopology;
```
## `TreeClipboard`

```ts
interface TreeClipboard extends Record<string, JSONValue> {
  readonly type: "application/vnd.interactive-os.tree+json";
  readonly nodes: ReadonlyArray<TreeNode>;
  readonly text: string;
}
```
## `TreeDocument`

```ts
interface TreeDocument extends Record<string, JSONValue> {
  readonly nodes: ReadonlyArray<TreeNode>;
}
```
## `TreeEditor`

```ts
interface TreeEditor {
  readonly snapshot: EditingSnapshot<TreeSelection>;
  selectedNodeIdsIn(topology: TreeTopology): ReadonlyArray<string>;
  dispatch(intent: TreeIntent): EditingResult<TreeSelection>;
  copy(topology: TreeTopology): TreeClipboard | null;
  cut(topology: TreeTopology): { readonly clipboard: TreeClipboard; readonly result: EditingResult<TreeSelection> } | null;
  reconcile(topology: TreeTopology): EditingSnapshot<TreeSelection>;
  undo(): EditingResult<TreeSelection>;
  redo(): EditingResult<TreeSelection>;
  subscribe(listener: (snapshot: EditingSnapshot<TreeSelection>) => void): () => void;
}
```
## `TreeIntent`

```ts
type TreeIntent =
  | {
      readonly type: "selection.set";
      readonly nodeId: string;
      readonly topology: TreeTopology;
      readonly mode?: "replace" | "extend" | "toggle";
    }
  | { readonly type: "selection.remove"; readonly topology: TreeTopology }
  | {
      readonly type: "clipboard.paste";
      readonly clipboard: TreeClipboard;
      readonly topology: TreeTopology;
      readonly afterId?: string;
    };
```
## `TreeNode`

```ts
interface TreeNode extends Record<string, JSONValue> {
  readonly id: string;
  readonly parentId: string | null;
  readonly label: string;
}
```
## `TreePoint`

```ts
interface TreePoint extends Record<string, JSONValue> {
  readonly nodeId: string;
}
```
## `TreeRange`

```ts
interface TreeRange extends Record<string, JSONValue> {
  readonly anchor: TreePoint;
  readonly focus: TreePoint;
}
```
## `TreeSelection`

```ts
interface TreeSelection extends Record<string, JSONValue> {
  readonly kind: "range";
  readonly ranges: ReadonlyArray<TreeRange>;
  readonly primaryIndex: number | null;
}
```
## `TreeTopology`

```ts
interface TreeTopology {
  readonly visibleIds: ReadonlyArray<string>;
}
```
## `TreeVisibility`

```ts
interface TreeVisibility {
  readonly rows: ReadonlyArray<TreeVisibilityRow>;
  readonly topology: TreeTopology;
}
```
## `TreeVisibilityNavigation`

```ts
type TreeVisibilityNavigation =
  | { readonly type: "move"; readonly direction: "previous" | "next" | "up" | "down" | "left" | "right" }
  | { readonly type: "boundary"; readonly edge: "start" | "end" };
```
## `treeVisibilityNeighbor`

```ts
treeVisibilityNeighbor(visibility: TreeVisibility, nodeId: string, navigation: TreeVisibilityNavigation): string | null
```
## `TreeVisibilityRow`

```ts
interface TreeVisibilityRow extends TreeNode {
  readonly depth: number;
  readonly posInSet: number;
  readonly setSize: number;
  readonly hasChildren: boolean;
  readonly expanded: boolean;
}
```
