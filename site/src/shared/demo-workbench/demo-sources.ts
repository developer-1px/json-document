import type { CodeLanguage } from "../ui/code-tokens";
import editingObservationSource from "../../../../packages/json-document-react/src/editing-observation.ts?raw";
import editingItemSource from "../../../../packages/json-document-react/src/use-editing.ts?raw";
import affordanceSessionSource from "../../../../packages/json-document-affordance/src/session.ts?raw";
import webFocusItemSource from "../../../../packages/json-document-web/src/focus-item.ts?raw";
import clipboardSource from "../../../../packages/json-document-web/src/clipboard.ts?raw";
import documentTextControlSource from "../../../../packages/json-document-react/src/use-document-text-control.ts?raw";
import documentEditingSource from "../../../../packages/json-document-editing/src/document.ts?raw";
import objectEditingSource from "../../../../packages/json-document-editing/src/object.ts?raw";
import kanbanEditingSource from "../../../../packages/json-document-editing/src/kanban.ts?raw";
import editingTopologySource from "../../../../packages/json-document-editing/src/topology.ts?raw";
import webGridCellSource from "../../../../packages/json-document-web/src/grid-cell.ts?raw";
import gridEditingSource from "../../../../packages/json-document-react/src/use-grid-editing.ts?raw";
import treeVisibilitySource from "../../../../packages/json-document-editing/src/tree-visibility.ts?raw";
import treeEditingSource from "../../../../packages/json-document-react/src/use-tree-editing.ts?raw";
import webDragDropSessionSource from "../../../../packages/json-document-web/src/drag-drop-session.ts?raw";
import webPointerSessionSource from "../../../../packages/json-document-web/src/pointer-session.ts?raw";
import webKanbanDropTargetSource from "../../../../packages/json-document-web/src/kanban-drop-target.ts?raw";
import boardDragSessionSource from "../../../../packages/json-document-affordance/src/board-drag-session.ts?raw";
import canvasGestureSessionSource from "../../../../packages/json-document-affordance/src/canvas-gesture-session.ts?raw";
import gestureSessionSource from "../../../../packages/json-document-affordance/src/gesture-session.ts?raw";
import databaseEditingSource from "../../../../packages/json-document-editing/src/database.ts?raw";
import databaseHandSource from "../../../../packages/json-document-database/src/database-hand.tsx?raw";
import annotationEditingSource from "../../../../packages/json-document-editing/src/annotation.ts?raw";
import webSVGCoordinateSource from "../../../../packages/json-document-web/src/svg-coordinate.ts?raw";
import webRasterSource from "../../../../packages/json-document-web/src/raster-source.ts?raw";
import webAnnotationRasterSource from "../../../../packages/json-document-web/src/annotation-raster.ts?raw";
import uiMenuSource from "../../../../packages/json-document-ui-primitives-react/src/menu.tsx?raw";
import uiSelectSource from "../../../../packages/json-document-ui-primitives-react/src/select.tsx?raw";
import uiSurfacesSource from "../../../../packages/json-document-ui-primitives-react/src/surfaces.tsx?raw";
import uiControlsSource from "../../../../packages/json-document-ui-primitives-react/src/controls.tsx?raw";
import uiListboxSource from "../../../../packages/json-document-ui-primitives-react/src/listbox.ts?raw";
import composerModelSource from "../../../../packages/json-document-composer/src/model.ts?raw";
import composerSchemaSource from "../../../../packages/json-document-composer/src/schema.ts?raw";
import composerTriggerSource from "../../../../packages/json-document-composer/src/trigger.ts?raw";
import composerCommandsSource from "../../../../packages/json-document-composer/src/commands.ts?raw";
import composerHostConfigSource from "../../../../packages/json-document-composer/src/host-config.ts?raw";
import composerInteractionSource from "../../../../packages/json-document-composer/src/interaction.ts?raw";
import composerSuggestionsSource from "../../../../packages/json-document-composer/src/suggestions.ts?raw";
import composerReferenceAtomSource from "../../../../packages/json-document-composer-react/src/reference-atom.tsx?raw";
import composerReactLifecycleSource from "../../../../packages/json-document-composer-react/src/use-composer.tsx?raw";
import composerCommandMenuSource from "../../../../packages/json-document-composer-react/src/command-menu.ts?raw";
import fileIntakeSource from "../../../../packages/json-document-file-intake/src/index.ts?raw";
import suggestionSource from "../../../../packages/json-document-rich-text-suggestion/src/index.ts?raw";
import suggestionReactSource from "../../../../packages/json-document-rich-text-suggestion-react/src/index.ts?raw";
import mentionSource from "../../../../packages/json-document-rich-text-mention/src/index.ts?raw";
import mentionReactSource from "../../../../packages/json-document-rich-text-mention-react/src/index.tsx?raw";
import webFileIntakeSource from "../../../../packages/json-document-web/src/file-intake.ts?raw";
import richTextReactSurfaceSource from "../../../../packages/json-document-rich-text-react/src/index.tsx?raw";
import uiFileSizeSource from "../../../../packages/json-document-ui-primitives-react/src/file-size.ts?raw";
import coreDocumentSource from "../../../../packages/json-document/src/application/document/create.ts?raw";
import selectionRangeSource from "../../../../packages/json-document-selection/src/range/index.ts?raw";
import contentEditableReactSource from "../../../../packages/json-document-contenteditable/src/content-editable.tsx?raw";
import collaborationCreateSource from "../../../../packages/json-document-collaboration/src/create.ts?raw";
import collaborationContentEditableSource from "../../../../packages/contenteditable-collaboration/src/lease.ts?raw";
import ajvSource from "../../../../packages/json-document-ajv/src/index.ts?raw";
import reactHookFormSource from "../../../../packages/json-document-react-hook-form/src/index.ts?raw";
import richTextSource from "../../../../packages/json-document-rich-text/src/editor.ts?raw";
import richTextWebSource from "../../../../packages/json-document-rich-text-web/src/contenteditable.ts?raw";
import tanStackTableSource from "../../../../packages/json-document-tanstack-table/src/index.ts?raw";
import zodSource from "../../../../packages/json-document-zod/src/index.ts?raw";

export type DemoSourceFile = {
  readonly path: string;
  readonly language: CodeLanguage;
  readonly referencePath?: string;
  readonly load: () => Promise<string>;
};

const packageReferencePaths = new Map([
  ["packages/json-document/", "/docs/api/json-document"],
  ["packages/json-document-selection/", "/docs/api/selection"],
  ["packages/json-document-editing/", "/docs/api/editing"],
  ["packages/json-document-react/", "/docs/api/react"],
  ["packages/json-document-react-hook-form/", "/docs/api/react-hook-form"],
  ["packages/json-document-ajv/", "/docs/api/ajv"],
  ["packages/json-document-zod/", "/docs/api/zod"],
  ["packages/json-document-tanstack-table/", "/docs/api/tanstack-table"],
  ["packages/json-document-affordance/", "/docs/api/affordance"],
  ["packages/json-document-ui-primitives-react/", "/docs/api/ui-primitives-react"],
  ["packages/json-document-database/", "/docs/api/database"],
  ["packages/json-document-web/", "/docs/api/web"],
  ["packages/json-document-contenteditable/", "/docs/api/contenteditable"],
  ["packages/json-document-rich-text/", "/docs/api/rich-text"],
  ["packages/json-document-file-intake/", "/docs/api/file-intake"],
  ["packages/json-document-rich-text-suggestion/", "/docs/api/rich-text-suggestion"],
  ["packages/json-document-rich-text-suggestion-react/", "/docs/api/rich-text-suggestion-react"],
  ["packages/json-document-rich-text-mention/", "/docs/api/rich-text-mention"],
  ["packages/json-document-rich-text-mention-react/", "/docs/api/rich-text-mention-react"],
  ["packages/json-document-composer/", "/docs/api/composer"],
  ["packages/json-document-composer-react/", "/docs/api/composer-react"],
  ["packages/json-document-rich-text-web/", "/docs/api/rich-text-web"],
  ["packages/json-document-rich-text-react/", "/docs/api/rich-text-react"],
  ["packages/json-document-collaboration/", "/docs/api/collaboration"],
  ["packages/contenteditable-collaboration/", "/docs/api/contenteditable-collaboration"],
] as const);

const sourceModules = import.meta.glob<string>(
  [
    "/src/routes/**/*.{ts,tsx}",
    "/src/shared/**/*.{ts,tsx}",
    "!/src/shared/ui/**",
    "!/src/shared/widget-binding/**",
  ],
  { import: "default", query: "?raw" },
);

const sourceText = new Map<string, Promise<string>>();
const sourceClosures = new Map<string, Promise<ReadonlyArray<DemoSourceFile>>>();
const excludedSources = new Set([
  "routes/connectors/ConnectorDemoPage.tsx",
  "routes/widgets/WidgetDemoFrame.tsx",
]);
const registeredUsageSources = new Map<string, string>([
  ["packages/json-document-react/src/editing-observation.ts", editingObservationSource],
  ["packages/json-document-react/src/use-editing.ts", editingItemSource],
  ["packages/json-document-affordance/src/session.ts", affordanceSessionSource],
  ["packages/json-document-web/src/focus-item.ts", webFocusItemSource],
  ["packages/json-document-web/src/clipboard.ts", clipboardSource],
  ["packages/json-document-react/src/use-document-text-control.ts", documentTextControlSource],
  ["packages/json-document-editing/src/document.ts", documentEditingSource],
  ["packages/json-document-editing/src/object.ts", objectEditingSource],
  ["packages/json-document-editing/src/kanban.ts", kanbanEditingSource],
  ["packages/json-document-editing/src/topology.ts", editingTopologySource],
  ["packages/json-document-web/src/grid-cell.ts", webGridCellSource],
  ["packages/json-document-react/src/use-grid-editing.ts", gridEditingSource],
  ["packages/json-document-editing/src/tree-visibility.ts", treeVisibilitySource],
  ["packages/json-document-react/src/use-tree-editing.ts", treeEditingSource],
  ["packages/json-document-web/src/drag-drop-session.ts", webDragDropSessionSource],
  ["packages/json-document-web/src/pointer-session.ts", webPointerSessionSource],
  ["packages/json-document-web/src/kanban-drop-target.ts", webKanbanDropTargetSource],
  ["packages/json-document-affordance/src/board-drag-session.ts", boardDragSessionSource],
  ["packages/json-document-affordance/src/canvas-gesture-session.ts", canvasGestureSessionSource],
  ["packages/json-document-affordance/src/gesture-session.ts", gestureSessionSource],
  ["packages/json-document-editing/src/database.ts", databaseEditingSource],
  ["packages/json-document-database/src/database-hand.tsx", databaseHandSource],
  ["packages/json-document-editing/src/annotation.ts", annotationEditingSource],
  ["packages/json-document-web/src/svg-coordinate.ts", webSVGCoordinateSource],
  ["packages/json-document-web/src/raster-source.ts", webRasterSource],
  ["packages/json-document-web/src/annotation-raster.ts", webAnnotationRasterSource],
  ["packages/json-document-ui-primitives-react/src/menu.tsx", uiMenuSource],
  ["packages/json-document-ui-primitives-react/src/select.tsx", uiSelectSource],
  ["packages/json-document-ui-primitives-react/src/surfaces.tsx", uiSurfacesSource],
  ["packages/json-document-ui-primitives-react/src/controls.tsx", uiControlsSource],
  ["packages/json-document-ui-primitives-react/src/listbox.ts", uiListboxSource],
  ["packages/json-document-composer/src/model.ts", composerModelSource],
  ["packages/json-document-composer/src/schema.ts", composerSchemaSource],
  ["packages/json-document-composer/src/trigger.ts", composerTriggerSource],
  ["packages/json-document-composer/src/commands.ts", composerCommandsSource],
  ["packages/json-document-composer/src/host-config.ts", composerHostConfigSource],
  ["packages/json-document-composer/src/interaction.ts", composerInteractionSource],
  ["packages/json-document-composer/src/suggestions.ts", composerSuggestionsSource],
  ["packages/json-document-composer-react/src/reference-atom.tsx", composerReferenceAtomSource],
  ["packages/json-document-composer-react/src/use-composer.tsx", composerReactLifecycleSource],
  ["packages/json-document-composer-react/src/command-menu.ts", composerCommandMenuSource],
  ["packages/json-document-file-intake/src/index.ts", fileIntakeSource],
  ["packages/json-document-rich-text-suggestion/src/index.ts", suggestionSource],
  ["packages/json-document-rich-text-suggestion-react/src/index.ts", suggestionReactSource],
  ["packages/json-document-rich-text-mention/src/index.ts", mentionSource],
  ["packages/json-document-rich-text-mention-react/src/index.tsx", mentionReactSource],
  ["packages/json-document-web/src/file-intake.ts", webFileIntakeSource],
  ["packages/json-document-rich-text-react/src/index.tsx", richTextReactSurfaceSource],
  ["packages/json-document-ui-primitives-react/src/file-size.ts", uiFileSizeSource],
  ["packages/json-document/src/application/document/create.ts", coreDocumentSource],
  ["packages/json-document-selection/src/range/index.ts", selectionRangeSource],
  ["packages/json-document-contenteditable/src/content-editable.tsx", contentEditableReactSource],
  ["packages/json-document-collaboration/src/create.ts", collaborationCreateSource],
  ["packages/contenteditable-collaboration/src/lease.ts", collaborationContentEditableSource],
  ["packages/json-document-ajv/src/index.ts", ajvSource],
  ["packages/json-document-react-hook-form/src/index.ts", reactHookFormSource],
  ["packages/json-document-rich-text/src/editor.ts", richTextSource],
  ["packages/json-document-rich-text-web/src/contenteditable.ts", richTextWebSource],
  ["packages/json-document-tanstack-table/src/index.ts", tanStackTableSource],
  ["packages/json-document-zod/src/index.ts", zodSource],
]);
const registeredPublicUsages = [
  {
    packageName: "@interactive-os/json-document",
    symbol: "createJSONDocument",
    sourcePath: "packages/json-document/src/application/document/create.ts",
  },
  {
    packageName: "@interactive-os/json-document-selection",
    symbol: "collapsedRangeSelection",
    sourcePath: "packages/json-document-selection/src/range/index.ts",
  },
  {
    packageName: "@interactive-os/json-document-contenteditable",
    symbol: "ContentEditable",
    sourcePath: "packages/json-document-contenteditable/src/content-editable.tsx",
  },
  {
    packageName: "@interactive-os/json-document-collaboration/text",
    symbol: "createTextRuntime",
    sourcePath: "packages/json-document-collaboration/src/create.ts",
  },
  {
    packageName: "@interactive-os/json-document-contenteditable-collaboration",
    symbol: "createContentEditableAdapter",
    sourcePath: "packages/contenteditable-collaboration/src/lease.ts",
  },
  {
    packageName: "@interactive-os/json-document-ajv",
    symbol: "createAjvValidator",
    sourcePath: "packages/json-document-ajv/src/index.ts",
  },
  {
    packageName: "@interactive-os/json-document-react-hook-form",
    symbol: "useReactHookFormConnector",
    sourcePath: "packages/json-document-react-hook-form/src/index.ts",
  },
  {
    packageName: "@interactive-os/json-document-rich-text",
    symbol: "createRichTextEditor",
    sourcePath: "packages/json-document-rich-text/src/editor.ts",
  },
  {
    packageName: "@interactive-os/json-document-rich-text-web",
    symbol: "createRichTextContentEditableBinding",
    sourcePath: "packages/json-document-rich-text-web/src/contenteditable.ts",
  },
  {
    packageName: "@interactive-os/json-document-tanstack-table",
    symbol: "createTanStackTableConnector",
    sourcePath: "packages/json-document-tanstack-table/src/index.ts",
  },
  {
    packageName: "@interactive-os/json-document-zod",
    symbol: "createZodValidator",
    sourcePath: "packages/json-document-zod/src/index.ts",
  },
  {
    packageName: "@interactive-os/json-document-rich-text-suggestion",
    symbol: "findRichTextSuggestionTrigger",
    sourcePath: "packages/json-document-rich-text-suggestion/src/index.ts",
  },
  {
    packageName: "@interactive-os/json-document-rich-text-suggestion-react",
    symbol: "useRichTextSuggestion",
    sourcePath: "packages/json-document-rich-text-suggestion-react/src/index.ts",
  },
  {
    packageName: "@interactive-os/json-document-file-intake",
    symbol: "validateFileCandidates",
    sourcePath: "packages/json-document-file-intake/src/index.ts",
  },
  {
    packageName: "@interactive-os/json-document-rich-text-mention",
    symbol: "insertRichTextMention",
    sourcePath: "packages/json-document-rich-text-mention/src/index.ts",
  },
  {
    packageName: "@interactive-os/json-document-rich-text-mention-react",
    symbol: "RichTextMentionAtom",
    sourcePath: "packages/json-document-rich-text-mention-react/src/index.tsx",
  },
  {
    packageName: "@interactive-os/json-document-composer",
    symbol: "createComposerDraft",
    sourcePath: "packages/json-document-composer/src/model.ts",
  },
  {
    packageName: "@interactive-os/json-document-composer",
    symbol: "composerSchema",
    sourcePath: "packages/json-document-composer/src/schema.ts",
  },
  {
    packageName: "@interactive-os/json-document-composer",
    symbol: "findComposerTrigger",
    sourcePath: "packages/json-document-composer/src/trigger.ts",
  },
  {
    packageName: "@interactive-os/json-document-composer",
    symbol: "insertComposerReference",
    sourcePath: "packages/json-document-composer/src/commands.ts",
  },
  {
    packageName: "@interactive-os/json-document-composer",
    symbol: "composerHostConfigSchema",
    sourcePath: "packages/json-document-composer/src/host-config.ts",
  },
  {
    packageName: "@interactive-os/json-document-composer",
    symbol: "addComposerAttachments",
    sourcePath: "packages/json-document-composer/src/commands.ts",
  },
  {
    packageName: "@interactive-os/json-document-composer",
    symbol: "composerInteractionFromKeyStroke",
    sourcePath: "packages/json-document-composer/src/interaction.ts",
  },
  {
    packageName: "@interactive-os/json-document-composer",
    symbol: "resolveComposerSuggestions",
    sourcePath: "packages/json-document-composer/src/suggestions.ts",
  },
  {
    packageName: "@interactive-os/json-document-composer-react",
    symbol: "ComposerReferenceAtom",
    sourcePath: "packages/json-document-composer-react/src/reference-atom.tsx",
  },
  {
    packageName: "@interactive-os/json-document-composer-react",
    symbol: "useComposer",
    sourcePath: "packages/json-document-composer-react/src/use-composer.tsx",
  },
  {
    packageName: "@interactive-os/json-document-composer-react",
    symbol: "useComposer",
    sourcePath: "packages/json-document-composer-react/src/command-menu.ts",
  },
  {
    packageName: "@interactive-os/json-document-composer-react",
    symbol: "useComposer",
    sourcePath: "packages/json-document-composer-react/src/reference-atom.tsx",
  },
  {
    packageName: "@interactive-os/json-document-ui-primitives-react",
    symbol: "formatFileSize",
    sourcePath: "packages/json-document-ui-primitives-react/src/file-size.ts",
  },
  {
    packageName: "@interactive-os/json-document-web",
    symbol: "fileCandidatesFromWebFiles",
    sourcePath: "packages/json-document-web/src/file-intake.ts",
  },
  {
    packageName: "@interactive-os/json-document-rich-text-react",
    symbol: "RichTextEditorSurface",
    sourcePath: "packages/json-document-rich-text-react/src/index.tsx",
  },
  {
    packageName: "@interactive-os/json-document-ui-primitives-react",
    symbol: "useListbox",
    sourcePath: "packages/json-document-ui-primitives-react/src/listbox.ts",
  },
  ...(["ActionButton", "ToggleButton", "IconButton", "SelectableItem", "DisclosureButton"] as const).map((symbol) => ({
    packageName: "@interactive-os/json-document-ui-primitives-react",
    symbol,
    sourcePath: "packages/json-document-ui-primitives-react/src/controls.tsx",
  })),
  {
    packageName: "@interactive-os/json-document-affordance",
    symbol: "createGestureSession",
    sourcePath: "packages/json-document-affordance/src/gesture-session.ts",
  },
  {
    packageName: "@interactive-os/json-document-web",
    symbol: "projectWebClientPointToSVG",
    sourcePath: "packages/json-document-web/src/svg-coordinate.ts",
  },
  {
    packageName: "@interactive-os/json-document-web",
    symbol: "readWebRasterFile",
    sourcePath: "packages/json-document-web/src/raster-source.ts",
  },
  {
    packageName: "@interactive-os/json-document-web",
    symbol: "renderWebAnnotationRaster",
    sourcePath: "packages/json-document-web/src/annotation-raster.ts",
  },
  {
    packageName: "@interactive-os/json-document-editing",
    symbol: "createKanbanEditor",
    sourcePath: "packages/json-document-editing/src/kanban.ts",
  },
  {
    packageName: "@interactive-os/json-document-web",
    symbol: "kanbanCardDropTargetFromWebElement",
    sourcePath: "packages/json-document-web/src/kanban-drop-target.ts",
  },
  {
    packageName: "@interactive-os/json-document-web",
    symbol: "findWebKanbanCardDropTarget",
    sourcePath: "packages/json-document-web/src/kanban-drop-target.ts",
  },
  {
    packageName: "@interactive-os/json-document-editing",
    symbol: "createAnnotationEditor",
    sourcePath: "packages/json-document-editing/src/annotation.ts",
  },
  {
    packageName: "@interactive-os/json-document-react",
    symbol: "editingItemProps",
    sourcePath: "packages/json-document-react/src/use-editing.ts",
  },
  {
    packageName: "@interactive-os/json-document-react",
    symbol: "useEditingObservation",
    sourcePath: "packages/json-document-react/src/editing-observation.ts",
  },
  {
    packageName: "@interactive-os/json-document-affordance",
    symbol: "createTypeaheadSession",
    sourcePath: "packages/json-document-affordance/src/session.ts",
  },
  {
    packageName: "@interactive-os/json-document-affordance",
    symbol: "createRenameSession",
    sourcePath: "packages/json-document-affordance/src/session.ts",
  },
  {
    packageName: "@interactive-os/json-document-affordance",
    symbol: "createLineFocusSession",
    sourcePath: "packages/json-document-affordance/src/session.ts",
  },
  {
    packageName: "@interactive-os/json-document-web",
    symbol: "webFocusItemProps",
    sourcePath: "packages/json-document-web/src/focus-item.ts",
  },
  {
    packageName: "@interactive-os/json-document-web",
    symbol: "focusWebItem",
    sourcePath: "packages/json-document-web/src/focus-item.ts",
  },
  {
    packageName: "@interactive-os/json-document-web",
    symbol: "createWebClipboardSurface",
    sourcePath: "packages/json-document-web/src/clipboard.ts",
  },
  {
    packageName: "@interactive-os/json-document-web",
    symbol: "createWebClipboardTextWriter",
    sourcePath: "packages/json-document-web/src/clipboard.ts",
  },
  {
    packageName: "@interactive-os/json-document-react",
    symbol: "DocumentTextControl",
    sourcePath: "packages/json-document-react/src/use-document-text-control.ts",
  },
  {
    packageName: "@interactive-os/json-document-editing",
    symbol: "documentSelectionFocus",
    sourcePath: "packages/json-document-editing/src/document.ts",
  },
  {
    packageName: "@interactive-os/json-document-react",
    symbol: "useGridEditing",
    sourcePath: "packages/json-document-react/src/use-grid-editing.ts",
  },
  {
    packageName: "@interactive-os/json-document-react",
    symbol: "useTreeEditing",
    sourcePath: "packages/json-document-react/src/use-tree-editing.ts",
  },
  {
    packageName: "@interactive-os/json-document-editing",
    symbol: "projectTreeVisibility",
    sourcePath: "packages/json-document-editing/src/tree-visibility.ts",
  },
  {
    packageName: "@interactive-os/json-document-editing",
    symbol: "createObjectEditor",
    sourcePath: "packages/json-document-editing/src/object.ts",
  },
  {
    packageName: "@interactive-os/json-document-editing",
    symbol: "nextDatabasePropertySort",
    sourcePath: "packages/json-document-editing/src/database.ts",
  },
  {
    packageName: "@interactive-os/json-document-database",
    symbol: "DatabaseHand",
    sourcePath: "packages/json-document-database/src/database-hand.tsx",
  },
  {
    packageName: "@interactive-os/json-document-editing",
    symbol: "gridPointKey",
    sourcePath: "packages/json-document-editing/src/topology.ts",
  },
  {
    packageName: "@interactive-os/json-document-web",
    symbol: "webGridCellAddressProps",
    sourcePath: "packages/json-document-web/src/grid-cell.ts",
  },
  {
    packageName: "@interactive-os/json-document-web",
    symbol: "findWebGridCell",
    sourcePath: "packages/json-document-web/src/grid-cell.ts",
  },
  {
    packageName: "@interactive-os/json-document-web",
    symbol: "createWebDragDropSession",
    sourcePath: "packages/json-document-web/src/drag-drop-session.ts",
  },
  {
    packageName: "@interactive-os/json-document-web",
    symbol: "createWebPointerSession",
    sourcePath: "packages/json-document-web/src/pointer-session.ts",
  },
  {
    packageName: "@interactive-os/json-document-affordance",
    symbol: "createBoardDragSession",
    sourcePath: "packages/json-document-affordance/src/board-drag-session.ts",
  },
  {
    packageName: "@interactive-os/json-document-affordance",
    symbol: "createCanvasGestureSession",
    sourcePath: "packages/json-document-affordance/src/canvas-gesture-session.ts",
  },
  {
    packageName: "@interactive-os/json-document-ui-primitives-react",
    symbol: "Select",
    sourcePath: "packages/json-document-ui-primitives-react/src/select.tsx",
  },
  {
    packageName: "@interactive-os/json-document-ui-primitives-react",
    symbol: "Menu",
    sourcePath: "packages/json-document-ui-primitives-react/src/menu.tsx",
  },
  {
    packageName: "@interactive-os/json-document-ui-primitives-react",
    symbol: "FileDropRegion",
    sourcePath: "packages/json-document-ui-primitives-react/src/surfaces.tsx",
  },
  {
    packageName: "@interactive-os/json-document-ui-primitives-react",
    symbol: "GridCell",
    sourcePath: "packages/json-document-ui-primitives-react/src/surfaces.tsx",
  },
  {
    packageName: "@interactive-os/json-document-ui-primitives-react",
    symbol: "ResizeHandle",
    sourcePath: "packages/json-document-ui-primitives-react/src/surfaces.tsx",
  },
] as const;

export function demoEntrySource(path: string): DemoSourceFile {
  return sourceFile(path);
}

export function discoverDemoSources(entry: string): Promise<ReadonlyArray<DemoSourceFile>> {
  const cached = sourceClosures.get(entry);
  if (cached !== undefined) return cached;
  const discovered = discoverSourceClosure(entry);
  sourceClosures.set(entry, discovered);
  return discovered;
}

async function discoverSourceClosure(entry: string): Promise<ReadonlyArray<DemoSourceFile>> {
  const paths: string[] = [];
  const visited = new Set<string>();

  async function visit(path: string): Promise<void> {
    if (visited.has(path) || isExcluded(path)) return;
    visited.add(path);
    paths.push(path);
    const source = await loadSource(path);
    for (const specifier of relativeSpecifiers(source)) {
      const resolved = resolveSource(path, specifier);
      if (resolved !== undefined) await visit(resolved);
    }
    for (const usage of registeredPublicUsages) {
      if (hasNamedImport(source, usage.packageName, usage.symbol)) {
        await visit(usage.sourcePath);
      }
    }
  }

  await visit(entry);
  return paths.map(sourceFile);
}

function hasNamedImport(source: string, packageName: string, symbol: string): boolean {
  const escapedPackage = packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const imports = new RegExp(`import\\s*\\{([^{}]*)\\}\\s*from\\s*["']${escapedPackage}["']`, "g");
  for (const match of source.matchAll(imports)) {
    const imported = match[1]?.split(",").map((entry) => entry.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0]);
    if (imported?.includes(symbol)) return true;
  }
  return false;
}

function sourceFile(path: string): DemoSourceFile {
  if (sourceModules[`/src/${path}`] === undefined && !registeredUsageSources.has(path)) {
    throw new Error(`Unknown demo source: ${path}`);
  }
  return {
    path,
    language: path.endsWith(".tsx") ? "tsx" : "typescript",
    referencePath: [...packageReferencePaths].find(([prefix]) => path.startsWith(prefix))?.[1],
    load: () => loadSource(path),
  };
}

function isExcluded(path: string): boolean {
  if (registeredUsageSources.has(path)) return false;
  return path.startsWith("app/")
    || path.startsWith("shared/ui/")
    || path.startsWith("shared/demo-workbench/")
    || path.startsWith("shared/widget-binding/")
    || excludedSources.has(path);
}

function relativeSpecifiers(source: string): ReadonlyArray<string> {
  const specifiers: string[] = [];
  const pattern = /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?["'](\.[^"']+)["']/g;
  for (const match of source.matchAll(pattern)) specifiers.push(match[1]!);
  return specifiers;
}

function resolveSource(importer: string, specifier: string): string | undefined {
  const parts = importer.split("/");
  parts.pop();
  for (const part of specifier.split("/")) {
    if (part === "." || part === "") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  const base = parts.join("/");
  return [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]
    .find((candidate) => sourceModules[`/src/${candidate}`] !== undefined);
}

function loadSource(path: string): Promise<string> {
  const cached = sourceText.get(path);
  if (cached !== undefined) return cached;
  const loaded = sourceLoader(path)();
  sourceText.set(path, loaded);
  return loaded;
}

function sourceLoader(path: string): () => Promise<string> {
  const registered = registeredUsageSources.get(path);
  if (registered !== undefined) return async () => registered;
  const load = sourceModules[`/src/${path}`];
  if (load === undefined) throw new Error(`Unknown demo source: ${path}`);
  return load;
}
