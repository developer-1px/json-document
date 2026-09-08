import type { GridPoint, GridTopology } from "@interactive-os/json-document-editing";
import type { NavigationCommand } from "@interactive-os/json-document-selection";

export interface WebKeyboardStroke {
  readonly key: string;
  readonly shiftKey: boolean;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey?: boolean;
}

export type WebKeyboardCommand =
  | Extract<NavigationCommand, { readonly type: "move" } | { readonly type: "boundary" }>
  | { readonly type: "toggle" }
  | { readonly type: "delete" }
  | { readonly type: "undo" }
  | { readonly type: "redo" };

export type WebKeymap<Command = WebKeyboardCommand> = Readonly<Record<string, Command>>;

export interface WebKeyboardAdapter<Command = WebKeyboardCommand> {
  resolve(stroke: WebKeyboardStroke): Command | null;
}

const move = (
  direction: Extract<NavigationCommand, { readonly type: "move" }>["direction"],
  operation: "replace" | "extend",
): WebKeyboardCommand => ({ type: "move", direction, operation });

const boundary = (
  edge: "start" | "end",
  operation: "replace" | "extend",
): WebKeyboardCommand => ({ type: "boundary", edge, operation });

/** Official conventional structural keymap. Product policy stays in the host. */
export const defaultWebKeymap: WebKeymap = Object.freeze({
  ArrowUp: move("up", "replace"),
  ArrowDown: move("down", "replace"),
  ArrowLeft: move("left", "replace"),
  ArrowRight: move("right", "replace"),
  "Shift-ArrowUp": move("up", "extend"),
  "Shift-ArrowDown": move("down", "extend"),
  "Shift-ArrowLeft": move("left", "extend"),
  "Shift-ArrowRight": move("right", "extend"),
  Home: boundary("start", "replace"),
  End: boundary("end", "replace"),
  "Shift-Home": boundary("start", "extend"),
  "Shift-End": boundary("end", "extend"),
  Space: { type: "toggle" },
  "Mod-Space": { type: "toggle" },
  Delete: { type: "delete" },
  Backspace: { type: "delete" },
  "Mod-z": { type: "undo" },
  "Mod-Shift-z": { type: "redo" },
});

export function createWebKeyboardAdapter(): WebKeyboardAdapter;
export function createWebKeyboardAdapter(
  options: { readonly keymap?: WebKeymap; readonly defaults?: true },
): WebKeyboardAdapter;
export function createWebKeyboardAdapter<Command>(
  options: { readonly keymap: WebKeymap<Command>; readonly defaults: false },
): WebKeyboardAdapter<Command>;
export function createWebKeyboardAdapter<Command>(
  options: {
    readonly keymap?: WebKeymap<Command>;
    readonly defaults?: boolean;
  } = {},
): WebKeyboardAdapter<Command | WebKeyboardCommand> {
  const keymap: WebKeymap<Command | WebKeyboardCommand> = options.defaults === false
    ? { ...options.keymap }
    : { ...defaultWebKeymap, ...options.keymap };
  return {
    resolve(stroke) {
      return keymap[chordFromStroke(stroke)] ?? null;
    },
  };
}

export function chordFromStroke(stroke: WebKeyboardStroke): string {
  const key = keyName(stroke.key);
  const parts: string[] = [];
  if (stroke.metaKey || stroke.ctrlKey) parts.push("Mod");
  if (stroke.altKey) parts.push("Alt");
  if (stroke.shiftKey) parts.push("Shift");
  parts.push(key);
  return parts.join("-");
}

export function moveGridPoint(
  topology: GridTopology,
  point: GridPoint,
  direction: Extract<NavigationCommand, { readonly type: "move" }>["direction"],
): GridPoint | null {
  const index = indexOf(topology, point);
  if (index === null) return null;
  if (direction === "up") return at(topology, index.rowIndex - 1, index.columnIndex);
  if (direction === "down") return at(topology, index.rowIndex + 1, index.columnIndex);
  if (direction === "left") return at(topology, index.rowIndex, index.columnIndex - 1);
  if (direction === "right") return at(topology, index.rowIndex, index.columnIndex + 1);
  const linear = index.rowIndex * topology.columnIds.length + index.columnIndex;
  const next = direction === "previous" ? linear - 1 : linear + 1;
  if (next < 0 || next >= topology.rowIds.length * topology.columnIds.length) return null;
  return at(
    topology,
    Math.floor(next / topology.columnIds.length),
    next % topology.columnIds.length,
  );
}

export function moveLinePoint(
  ids: ReadonlyArray<string>,
  currentId: string,
  direction: Extract<NavigationCommand, { readonly type: "move" }>["direction"],
): string | null {
  const index = ids.indexOf(currentId);
  if (index < 0) return null;
  const delta = direction === "up" || direction === "left" || direction === "previous" ? -1 : 1;
  return ids[index + delta] ?? null;
}

export function lineBoundary(
  ids: ReadonlyArray<string>,
  edge: "start" | "end",
): string | null {
  return (edge === "start" ? ids[0] : ids[ids.length - 1]) ?? null;
}

export function gridBoundary(
  topology: GridTopology,
  point: GridPoint,
  edge: "start" | "end",
): GridPoint | null {
  const index = indexOf(topology, point);
  if (index === null) return null;
  return at(topology, index.rowIndex, edge === "start" ? 0 : topology.columnIds.length - 1);
}

function keyName(key: string): string {
  if (key === " ") return "Space";
  if (key.length === 1) return key.toLowerCase();
  return key;
}

function indexOf(
  topology: GridTopology,
  point: GridPoint,
): { readonly rowIndex: number; readonly columnIndex: number } | null {
  const rowIndex = topology.rowIds.indexOf(point.rowId);
  const columnIndex = topology.columnIds.indexOf(point.columnId);
  if (rowIndex < 0 || columnIndex < 0) return null;
  return { rowIndex, columnIndex };
}

function at(topology: GridTopology, rowIndex: number, columnIndex: number): GridPoint | null {
  const rowId = topology.rowIds[rowIndex];
  const columnId = topology.columnIds[columnIndex];
  if (rowId === undefined || columnId === undefined) return null;
  return { rowId, columnId };
}
