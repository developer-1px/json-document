import type { JSONValue } from "@interactive-os/json-document";
import {
  gridPointFromKey,
  gridPointKey,
  type EditingSnapshot,
  type GridPoint,
} from "@interactive-os/json-document-editing";
import {
  useEditing,
  type EditingItem,
  type EditingKeyDownEvent,
  type EditingKeyboardCommand,
  type EditingKeyboardOptions,
  type EditingSelectionMode,
  type UseEditingOptions,
} from "./use-editing.js";
import type { EditingSnapshotSource } from "./editing-snapshot.js";

export interface GridEditingKeyboardOptions {
  readonly resolve: EditingKeyboardOptions<string>["resolve"];
  readonly focusPoint: () => GridPoint | undefined;
  readonly neighbor: (
    point: GridPoint,
    command: Extract<EditingKeyboardCommand, { readonly type: "move" } | { readonly type: "boundary" }>,
  ) => GridPoint | null;
  readonly onDelete?: () => void;
  readonly onUndo?: () => void;
  readonly onRedo?: () => void;
  readonly afterMove?: (point: GridPoint) => void;
  readonly ignoreCommand?: EditingKeyboardOptions<string>["ignoreCommand"];
}

export interface UseGridEditingOptions<Selection extends JSONValue> {
  readonly source?: EditingSnapshotSource<Selection>;
  readonly selectedPoints: Iterable<GridPoint>;
  readonly focusPoint?: GridPoint | null;
  readonly onSelect: (point: GridPoint, mode: EditingSelectionMode) => void;
  readonly operationFromEvent?: UseEditingOptions<Selection>["operationFromEvent"];
  readonly ignorePress?: UseEditingOptions<Selection>["ignorePress"];
  readonly keyboard?: GridEditingKeyboardOptions;
}

export interface GridEditing<Selection extends JSONValue> {
  readonly snapshot: EditingSnapshot<Selection>;
  getCell(point: GridPoint): EditingItem;
  getKeyDownHandler(): (event: EditingKeyDownEvent) => void;
}

/** Connects canonical GridPoint selection to the generic React editing loop. */
export function useGridEditing<Selection extends JSONValue>(
  options: UseGridEditingOptions<Selection>,
): GridEditing<Selection> {
  const keyboard = options.keyboard;
  const editingKeyboard: EditingKeyboardOptions<string> | undefined = keyboard === undefined ? undefined : {
    resolve: keyboard.resolve,
    focusKey: () => {
      const point = keyboard.focusPoint();
      return point === undefined ? undefined : gridPointKey(point);
    },
    neighbor: (key, command) => {
      const point = gridPointFromKey(key);
      if (point === null) return null;
      const next = keyboard.neighbor(point, command);
      return next === null ? null : gridPointKey(next);
    },
    ...(keyboard.onDelete === undefined ? {} : { onDelete: keyboard.onDelete }),
    ...(keyboard.onUndo === undefined ? {} : { onUndo: keyboard.onUndo }),
    ...(keyboard.onRedo === undefined ? {} : { onRedo: keyboard.onRedo }),
    ...(keyboard.afterMove === undefined ? {} : {
      afterMove: (key: string) => {
        const point = gridPointFromKey(key);
        if (point !== null) keyboard.afterMove?.(point);
      },
    }),
    ...(keyboard.ignoreCommand === undefined ? {} : { ignoreCommand: keyboard.ignoreCommand }),
  };
  const editing = useEditing({
    ...(options.source === undefined ? {} : { source: options.source }),
    selectedKeys: Array.from(options.selectedPoints, gridPointKey),
    focusKey: options.focusPoint ? gridPointKey(options.focusPoint) : null,
    onSelect(key, mode) {
      const point = gridPointFromKey(key);
      if (point !== null) options.onSelect(point, mode);
    },
    ...(options.operationFromEvent === undefined ? {} : { operationFromEvent: options.operationFromEvent }),
    ...(options.ignorePress === undefined ? {} : { ignorePress: options.ignorePress }),
    ...(editingKeyboard === undefined ? {} : { keyboard: editingKeyboard }),
  });

  return {
    snapshot: editing.snapshot,
    getCell: (point) => editing.getItem(gridPointKey(point)),
    getKeyDownHandler: editing.getKeyDownHandler,
  };
}
