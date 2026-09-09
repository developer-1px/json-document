import { createKeySelectionFamily, type KeySelection, type KeySelectionCommand } from "@interactive-os/json-document-selection";
import { createWebKeyboardAdapter, type WebKeyboardStroke } from "@interactive-os/json-document-web";
import { dragAffordance, marqueeAffordance, marqueeHitsAffordance, type Point, type Rect } from "./drag.js";
import { createGestureSession, type GestureCancelReason } from "./gesture-session.js";
import { escapeAffordance, planeHitAffordance, selectAllAffordance } from "./select.js";

export type PlaneSelectSelection = Extract<KeySelection, { readonly kind: "explicit" }>;

/** Items and pointer points must use the same coordinate space; order determines primary fallback. */
export interface PlaneSelectContext {
  readonly items: ReadonlyArray<Rect & { readonly id: string }>;
  readonly selection: PlaneSelectSelection;
}

export interface PlaneSelectInput {
  readonly point: Point;
  readonly hitKey: string | null;
  readonly shiftKey?: boolean;
}

export interface PlaneSelectTranslation {
  readonly keys: readonly string[];
  readonly dx: number;
  readonly dy: number;
}

export interface PlaneSelectPreview {
  readonly selection: PlaneSelectSelection;
  readonly marquee: Rect | null;
  readonly translation: PlaneSelectTranslation | null;
}

export interface PlaneSelectCommit {
  readonly selection: PlaneSelectSelection;
  readonly translation: PlaneSelectTranslation | null;
}

export type PlaneSelectKeyResult =
  | { readonly type: "selection"; readonly selection: PlaneSelectSelection }
  | { readonly type: "delete"; readonly keys: readonly string[] }
  | { readonly type: "edit"; readonly key: string }
  | { readonly type: "cancel" };

export interface PlaneSelectProfileOptions {
  /** In the input coordinate space. Defaults to 3; movement is latched once crossed. */
  readonly dragThreshold?: number;
  readonly contain?: "intersect" | "inside";
}

export interface PlaneSelectProfile {
  begin(context: PlaneSelectContext, input: PlaneSelectInput): PlaneSelectPreview;
  preview(point: Point): PlaneSelectPreview | null;
  commit(point: Point): PlaneSelectCommit | null;
  cancel(reason?: GestureCancelReason): void;
  getPreview(): PlaneSelectPreview | null;
  /** Discrete activation (e.g. Space), not focus. Shift toggles, plain activation replaces. */
  select(context: PlaneSelectContext, key: string | null, shiftKey?: boolean): PlaneSelectSelection;
  /** Native editable/IME ownership is checked by the platform binding before calling. */
  keyDown(stroke: WebKeyboardStroke, context: PlaneSelectContext, grabbing?: boolean): PlaneSelectKeyResult | null;
}

type Gesture = {
  readonly type: "plane-select";
  readonly context: PlaneSelectContext;
  readonly input: PlaneSelectInput;
  readonly selection: PlaneSelectSelection;
  readonly point: Point;
  readonly moved: boolean;
};

const family = createKeySelectionFamily();
const keyboard = createWebKeyboardAdapter();
const editKeyboard = createWebKeyboardAdapter<"edit">({ defaults: false, keymap: { Enter: "edit", F2: "edit" } });

function selectionContext(context: PlaneSelectContext) {
  return { keys: context.items.map((item) => item.id), universe: "plane", universeMismatch: "clear" as const };
}

function transition(context: PlaneSelectContext, command: KeySelectionCommand): PlaneSelectSelection {
  const topology = selectionContext(context);
  const state = family.transition(context.selection, command, topology).state;
  return { kind: "explicit", keys: family.targets(state, topology), primaryKey: state.primaryKey };
}

/** Minimal flat selection grammar. Owns previews and outcomes, never a document, DOM or History. */
export function createPlaneSelectProfile(options: PlaneSelectProfileOptions = {}): PlaneSelectProfile {
  const threshold = options.dragThreshold ?? 3;
  if (!Number.isFinite(threshold) || threshold < 0) throw new RangeError("dragThreshold must be finite and non-negative");
  const gestures = createGestureSession<Gesture>();

  function select(context: PlaneSelectContext, key: string | null, shiftKey = false) {
    return transition(context, key === null ? { type: "clear" } : { type: shiftKey ? "toggle" : "replace", keys: [key], primaryKey: key });
  }

  function project(gesture: Gesture): PlaneSelectPreview {
    const { context, input, point, selection, moved } = gesture;
    if (input.hitKey === null && moved) {
      const band = marqueeAffordance(input.point, point, input);
      if (band.hand?.type === "select" && band.hand.rect) {
        const hit = marqueeHitsAffordance({ rect: band.hand.rect, items: context.items, contain: options.contain ?? "intersect" });
        if (hit.hand?.type === "select") return {
          selection: transition(context, { type: input.shiftKey ? "add" : "replace", keys: hit.hand.objectIds ?? [] }),
          marquee: band.hand.rect, translation: null,
        };
      }
      return { selection: transition(context, { type: input.shiftKey ? "add" : "replace", keys: [] }), marquee: null, translation: null };
    }
    const delta = moved && input.hitKey !== null && selection.keys.includes(input.hitKey)
      ? dragAffordance(input.point, point).hand : null;
    return {
      selection, marquee: null,
      translation: delta?.type === "translate" && (delta.dx !== 0 || delta.dy !== 0)
        ? { keys: selection.keys, dx: delta.dx, dy: delta.dy } : null,
    };
  }

  function preview(point: Point) {
    const active = gestures.preview((gesture) => ({ ...gesture, point: { ...point },
      moved: gesture.moved || Math.hypot(point.x - gesture.input.point.x, point.y - gesture.input.point.y) > threshold,
    }));
    return active ? project(active) : null;
  }

  return {
    begin(context, input) {
      const selection = transition(context, { type: "set-primary", key: context.selection.primaryKey });
      const captured = { items: context.items.map((item) => ({ ...item })), selection };
      const hitKey = input.hitKey !== null && captured.items.some((item) => item.id === input.hitKey) ? input.hitKey : null;
      const press = hitKey === null ? null : planeHitAffordance({ hitId: hitKey, selectedIds: selection.keys, shiftKey: input.shiftKey ?? false }).hand;
      const active = gestures.begin({ type: "plane-select", context: captured, input: { ...input, point: { ...input.point }, hitKey },
        point: { ...input.point }, moved: false,
        selection: press?.type === "select" ? transition(captured, { type: "replace", keys: press.objectIds ?? [], primaryKey: hitKey! }) : selection,
      });
      return project(active);
    },
    preview,
    commit(point) {
      preview(point);
      const active = gestures.commit();
      if (!active) return null;
      const result = project(active);
      return {
        selection: !active.moved ? select(active.context, active.input.hitKey, active.input.shiftKey) : result.selection,
        translation: result.translation,
      };
    },
    cancel(reason) { gestures.cancel(reason); },
    getPreview() { const active = gestures.getActive(); return active ? project(active) : null; },
    select,
    keyDown(stroke, context, grabbing = false) {
      const selection = transition(context, { type: "set-primary", key: context.selection.primaryKey });
      const escape = escapeAffordance({ key: stroke.key, grabbing: grabbing || gestures.getActive() !== null, selected: selection.keys.length > 0 }).hand;
      let result: PlaneSelectKeyResult | null = null;
      if (escape?.type === "cancel") result = { type: "cancel" };
      else if (escape?.type === "clear") result = { type: "selection", selection: select(context, null) };
      else if (!stroke.altKey && selectAllAffordance(stroke, { allSelected: false }, { repeat: "preserve" }).hand) {
        result = { type: "selection", selection: transition(context, { type: "replace", keys: context.items.map((item) => item.id), ...(selection.primaryKey === null ? {} : { primaryKey: selection.primaryKey }) }) };
      } else {
        const command = keyboard.resolve(stroke);
        if (editKeyboard.resolve(stroke) === "edit" && selection.primaryKey !== null) result = { type: "edit", key: selection.primaryKey };
        else if (command?.type === "delete" && selection.keys.length) result = { type: "delete", keys: selection.keys };
      }
      if (result) gestures.cancel();
      return result;
    },
  };
}
