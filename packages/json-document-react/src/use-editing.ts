import { useCallback, useMemo, useRef } from "react";
import type { JSONValue } from "@interactive-os/json-document";
import type { EditingSnapshot } from "@interactive-os/json-document-editing";
import { useEditingSnapshot, type EditingSnapshotSource } from "./editing-snapshot.js";

export type EditingSelectionMode = "replace" | "extend" | "toggle";

export type EditingKeyboardCommand =
  | {
    readonly type: "move";
    readonly direction: "previous" | "next" | "up" | "down" | "left" | "right";
    readonly operation: "replace" | "extend";
  }
  | {
    readonly type: "boundary";
    readonly edge: "start" | "end";
    readonly operation: "replace" | "extend";
  }
  | { readonly type: "toggle" }
  | { readonly type: "delete" }
  | { readonly type: "undo" }
  | { readonly type: "redo" };

export interface EditingKeyboardStroke {
  readonly key: string;
  readonly shiftKey: boolean;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey?: boolean;
}

export interface EditingKeyDownEvent extends EditingKeyboardStroke {
  readonly target: EventTarget | null;
  preventDefault(): void;
}

export interface EditingPressEvent {
  readonly shiftKey: boolean;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly target?: EventTarget | null;
}

export interface EditingItem<Key extends string = string> {
  getIsSelected(): boolean;
  getPressHandler(): (event: EditingPressEvent) => void;
}

export interface EditingKeyboardOptions<Key extends string = string> {
  readonly resolve: (stroke: EditingKeyboardStroke) => EditingKeyboardCommand | null;
  readonly focusKey: () => Key | undefined;
  readonly neighbor: (
    key: Key,
    command: Extract<EditingKeyboardCommand, { readonly type: "move" } | { readonly type: "boundary" }>,
  ) => Key | null;
  readonly onDelete?: () => void;
  readonly onUndo?: () => void;
  readonly onRedo?: () => void;
  readonly afterMove?: (key: Key) => void;
  readonly ignoreCommand?: (
    command: EditingKeyboardCommand,
    context: { readonly inField: boolean; readonly event: EditingKeyDownEvent },
  ) => boolean;
}

export interface UseEditingOptions<Selection extends JSONValue, Key extends string = string> {
  readonly source: EditingSnapshotSource<Selection>;
  readonly selectedKeys: Iterable<Key>;
  readonly onSelect: (key: Key, mode: EditingSelectionMode) => void;
  readonly operationFromEvent?: (event: EditingPressEvent) => EditingSelectionMode;
  readonly ignorePress?: (event: EditingPressEvent) => boolean;
  readonly keyboard?: EditingKeyboardOptions<Key>;
}

export interface Editing<Selection extends JSONValue, Key extends string = string> {
  readonly snapshot: EditingSnapshot<Selection>;
  getItem(key: Key): EditingItem<Key>;
  getKeyDownHandler(): (event: EditingKeyDownEvent) => void;
}

export function selectionModeFromModifiers(event: EditingPressEvent): EditingSelectionMode {
  if (event.shiftKey) return "extend";
  if (event.metaKey || event.ctrlKey) return "toggle";
  return "replace";
}

export function useEditing<Selection extends JSONValue, Key extends string = string>(
  options: UseEditingOptions<Selection, Key>,
): Editing<Selection, Key> {
  const snapshot = useEditingSnapshot(options.source);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const selected = useMemo(() => new Set(options.selectedKeys), [options.selectedKeys]);

  const getItem = useCallback((key: Key): EditingItem<Key> => ({
    getIsSelected() {
      return selected.has(key);
    },
    getPressHandler() {
      return (event: EditingPressEvent) => {
        const current = optionsRef.current;
        if (current.ignorePress?.(event)) return;
        const mode = current.operationFromEvent?.(event) ?? selectionModeFromModifiers(event);
        current.onSelect(key, mode);
      };
    },
  }), [selected]);

  const getKeyDownHandler = useCallback(() => {
    return (event: EditingKeyDownEvent) => {
      const current = optionsRef.current;
      const keyboard = current.keyboard;
      if (keyboard === undefined) return;
      const command = keyboard.resolve(event);
      if (command === null) return;
      const inField = isEditingField(event.target);
      const ignore = keyboard.ignoreCommand
        ?? ((next: EditingKeyboardCommand, context: { readonly inField: boolean }) => (
          context.inField && next.type !== "undo" && next.type !== "redo"
        ));
      if (ignore(command, { inField, event })) return;

      if (command.type === "move" || command.type === "boundary") {
        const currentKey = keyboard.focusKey();
        if (currentKey === undefined) return;
        const next = keyboard.neighbor(currentKey, command);
        if (next === null) return;
        event.preventDefault();
        current.onSelect(next, command.operation);
        keyboard.afterMove?.(next);
        return;
      }
      if (command.type === "toggle") {
        const currentKey = keyboard.focusKey();
        if (currentKey === undefined) return;
        event.preventDefault();
        current.onSelect(currentKey, "toggle");
        return;
      }
      if (command.type === "delete") {
        if (keyboard.onDelete === undefined) return;
        event.preventDefault();
        keyboard.onDelete();
        return;
      }
      if (command.type === "undo") {
        if (keyboard.onUndo === undefined) return;
        event.preventDefault();
        keyboard.onUndo();
        return;
      }
      if (keyboard.onRedo === undefined) return;
      event.preventDefault();
      keyboard.onRedo();
    };
  }, []);

  return useMemo(() => ({
    snapshot,
    getItem,
    getKeyDownHandler,
  }), [getItem, getKeyDownHandler, snapshot]);
}

function isEditingField(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest("textarea, input, [contenteditable]") !== null;
}
