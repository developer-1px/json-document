import {
  EMPTY_SELECTION,
  type SelectionMode,
  type SelectionSnap,
} from "../../selection/snap.js";
import type { JSONStateOps } from "../state/ops.js";
import type { JSONPatchOperation } from "../../../foundation/patch/index.js";
import { createSelection, type SelectionOptions, type SelectionState } from "./create.js";

export interface DocumentSelectionRuntime {
  enabled: boolean;
  state: SelectionState | undefined;
  access: SelectionRuntimeAccess;
  ref: { readonly current: SelectionSnap } | undefined;
}

export interface SelectionRuntimeAccess {
  selectionEnabled: boolean;
  selectionMode: SelectionMode;
  snapSelection: () => SelectionSnap;
  restoreSelection: (selection: SelectionSnap) => void;
  selectionAfterForApplied: (applied: ReadonlyArray<JSONPatchOperation>) => SelectionSnap | undefined;
}

interface CreateDocumentSelectionRuntimeInput<T> {
  ops: JSONStateOps<T>;
  selection?: boolean | SelectionOptions | undefined;
  onChange?: (() => void) | undefined;
}

export function createDocumentSelectionRuntime<T>(
  input: CreateDocumentSelectionRuntimeInput<T>,
): DocumentSelectionRuntime {
  const selectionEnabled = input.selection !== undefined && input.selection !== false;
  const selectionAfterByApplied = new WeakMap<object, SelectionSnap>();
  const selectionOptions: SelectionOptions = typeof input.selection === "object" ? input.selection : {};
  const createSelectionOptions: SelectionOptions & {
    onChange?: () => void;
    applyMetadataSelectionAfter: true;
    onPatchSelection: (applied: ReadonlyArray<JSONPatchOperation>, selection: SelectionSnap) => void;
  } = {
    ...selectionOptions,
    applyMetadataSelectionAfter: true,
    onPatchSelection: (applied, selection) => {
      selectionAfterByApplied.set(applied as object, selection);
    },
  };
  if (input.onChange !== undefined) createSelectionOptions.onChange = input.onChange;

  const selectionState = selectionEnabled ? createSelection<T>(input.ops, createSelectionOptions) : undefined;
  const snapSelection = () => selectionState?.snapshot() ?? EMPTY_SELECTION;

  return {
    enabled: selectionEnabled,
    state: selectionState,
    access: {
      selectionEnabled,
      selectionMode: selectionOptions.mode ?? "single",
      snapSelection,
      restoreSelection: (selection) => { selectionState?.restore(selection); },
      selectionAfterForApplied: (applied) => selectionAfterByApplied.get(applied as object),
    },
    ref: selectionState ? { get current() { return selectionState; } } : undefined,
  };
}
