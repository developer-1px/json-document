import type { DocumentObject, ObjectDocument } from "./object-model.js";
import { layoutObjectText, type ObjectTextMeasurer } from "./object-text-layout.js";

export interface ObjectContainerPolicy { readonly overlapThreshold: number }
export type ObjectContainerLayout = {
  readonly direction: "horizontal" | "vertical" | "free";
  readonly gap: number;
  readonly padding: { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number };
}
export const defaultObjectContainerPolicy: ObjectContainerPolicy = { overlapThreshold: 0.3 };

export interface ObjectLayoutOptions {
  readonly measureText?: ObjectTextMeasurer;
  readonly containerPolicy?: ObjectContainerPolicy;
}

/** Includes each descendant once, even when both its ancestor and itself are selected. */
export function objectSubtreeIds(objects: ReadonlyArray<DocumentObject>, ids: ReadonlyArray<string>): string[] {
  const result = new Set(ids);
  let changed = true;
  while (changed) {
    changed = false;
    for (const object of objects) if (typeof object.parentId === "string" && result.has(object.parentId) && !result.has(object.id)) { result.add(object.id); changed = true; }
  }
  return [...result];
}

function overlap(child: DocumentObject, parent: DocumentObject) {
  const width = Math.max(0, Math.min(child.x + child.width, parent.x + parent.width) - Math.max(child.x, parent.x));
  const height = Math.max(0, Math.min(child.y + child.height, parent.y + parent.height) - Math.max(child.y, parent.y));
  return width * height / (child.width * child.height);
}

function inferLayout(parent: DocumentObject, children: DocumentObject[]): ObjectContainerLayout | undefined {
  if (children.length < 2) return undefined;
  const vertical = [...children].sort((a, b) => a.y - b.y);
  const horizontal = [...children].sort((a, b) => a.x - b.x);
  const aligned = (axis: "x" | "y", dimension: "width" | "height") => Math.max(...children.map(o => o[axis])) - Math.min(...children.map(o => o[axis])) <= Math.max(16, Math.min(...children.map(o => o[dimension])) * 0.25);
  const separated = (items: DocumentObject[], axis: "x" | "y", dimension: "width" | "height") => items.slice(1).every((o, i) => o[axis] >= items[i]![axis] + items[i]![dimension] - 1);
  const direction = aligned("x", "width") && separated(vertical, "y", "height") ? "vertical" : aligned("y", "height") && separated(horizontal, "x", "width") ? "horizontal" : "free";
  const items = direction === "vertical" ? vertical : horizontal;
  const gaps = items.slice(1).map((o, i) => direction === "vertical" ? o.y - items[i]!.y - items[i]!.height : o.x - items[i]!.x - items[i]!.width).sort((a, b) => a - b);
  return { direction, gap: Math.max(0, gaps[Math.floor(gaps.length / 2)] ?? 16), padding: {
    left: Math.max(0, Math.min(...children.map(o => o.x)) - parent.x),
    top: Math.max(0, Math.min(...children.map(o => o.y)) - parent.y),
    right: Math.max(0, parent.x + parent.width - Math.max(...children.map(o => o.x + o.width))),
    bottom: Math.max(0, parent.y + parent.height - Math.max(...children.map(o => o.y + o.height))),
  } };
}

/** Reconciles containment, measures text, then flows nested boxes from the inside out. */
export function layoutObjectDocument(document: ObjectDocument, options: ObjectLayoutOptions, previous?: ObjectDocument): ObjectDocument {
  const policy = options.containerPolicy;
  if (policy && (!Number.isFinite(policy.overlapThreshold) || policy.overlapThreshold <= 0 || policy.overlapThreshold > 1)) throw new TypeError("Overlap threshold must be in (0, 1].");
  const before = new Map(previous?.objects.map(object => [object.id, object]));
  let objects = document.objects.map(object => {
    const old = before.get(object.id);
    const sameTextLayout = old && ["label", "width", "height", "widthMode", "fontSize", "fontWeight"].every(key => old[key] === object[key]);
    return sameTextLayout ? object : layoutObjectText(object, options.measureText);
  });
  const ids = new Set(objects.map(object => object.id));
  objects = objects.map(object => {
    if (typeof object.parentId === "string" && !ids.has(object.parentId)) { const { parentId: _, ...rest } = object; return rest as DocumentObject; }
    return object;
  });
  if (policy) {
    const newBoxes = objects.some(o => o.kind === "rectangle" && !before.has(o.id));
    objects = objects.map(object => {
      const old = before.get(object.id);
      const parentMoved = typeof object.parentId === "string" && before.has(object.parentId) && (() => {
        const a = before.get(object.parentId)!; const b = objects.find(o => o.id === a.id)!;
        return a.x !== b.x || a.y !== b.y;
      })();
      // Explicit child movement may reparent; ancestor movement retains ownership.
      if (old && !newBoxes && (parentMoved || old.x === object.x && old.y === object.y)) return object;
      const candidates = objects.filter(parent => parent.id !== object.id && parent.kind === "rectangle" && parent.width * parent.height > object.width * object.height && overlap(object, parent) >= policy.overlapThreshold);
      candidates.sort((a, b) => overlap(object, b) - overlap(object, a) || a.width * a.height - b.width * b.height || Number(b.id === object.parentId) - Number(a.id === object.parentId) || a.id.localeCompare(b.id));
      const parent = candidates[0];
      if (parent?.id === object.parentId) return object;
      const { parentId: _, ...rest } = object;
      return parent ? { ...rest, parentId: parent.id } as DocumentObject : rest as DocumentObject;
    });
  }
  const map = new Map(objects.map(object => [object.id, object]));
  const shift = (id: string, dx: number, dy: number) => {
    for (const key of objectSubtreeIds([...map.values()], [id])) { const object = map.get(key)!; map.set(key, { ...object, x: object.x + dx, y: object.y + dy }); }
  };
  const visiting = new Set<string>(), done = new Set<string>();
  const flow = (id: string) => {
    if (done.has(id)) return;
    if (visiting.has(id)) throw new TypeError("Container hierarchy must not contain cycles.");
    visiting.add(id);
    const childIds = objects.filter(o => o.parentId === id).map(o => o.id);
    childIds.forEach(flow);
    let parent = map.get(id)!;
    const children = childIds.map(key => map.get(key)!);
    const layout = parent.containerLayout as unknown as ObjectContainerLayout | undefined ?? (policy ? inferLayout(parent, children) : undefined);
    if (layout && parent.kind === "rectangle") {
      parent = { ...parent, containerLayout: layout };
      map.set(id, parent);
      if (layout.direction !== "free" && children.length) {
        const vertical = layout.direction === "vertical";
        children.sort((a, b) => (vertical ? a.y - b.y || a.x - b.x : a.x - b.x || a.y - b.y));
        let cursor = vertical ? parent.y + layout.padding.top : parent.x + layout.padding.left;
        let cross = 0;
        for (const item of children) {
          let child = map.get(item.id)!;
          const parentWidthDelta = before.has(parent.id) ? parent.width - before.get(parent.id)!.width : 0;
          if (vertical && parentWidthDelta !== 0 && child.kind === "text" && child.widthMode !== "auto") {
            child = layoutObjectText({ ...child, width: Math.max(1, child.width + parentWidthDelta) }, options.measureText);
            map.set(child.id, child);
          }
          const x = vertical ? parent.x + layout.padding.left : cursor;
          const y = vertical ? cursor : parent.y + layout.padding.top;
          shift(child.id, x - child.x, y - child.y);
          cursor += (vertical ? child.height : child.width) + layout.gap;
          cross = Math.max(cross, vertical ? child.width : child.height);
        }
        const extent = cursor - layout.gap;
        map.set(id, { ...parent,
          width: vertical ? Math.max(parent.width, layout.padding.left + cross + layout.padding.right) : Math.max(1, extent - parent.x + layout.padding.right),
          height: vertical ? Math.max(1, extent - parent.y + layout.padding.bottom) : Math.max(1, layout.padding.top + cross + layout.padding.bottom),
        });
      }
    }
    visiting.delete(id); done.add(id);
  };
  objects.forEach(object => flow(object.id));
  const ordered: DocumentObject[] = [], emitted = new Set<string>();
  const emit = (id: string) => {
    if (emitted.has(id)) return;
    const object = map.get(id)!;
    if (typeof object.parentId === "string") emit(object.parentId);
    emitted.add(id); ordered.push(object);
  };
  objects.forEach(object => emit(object.id));
  return { ...document, objects: ordered };
}
