// RFC 6902 op 적용 시 Pointer 좌표를 자동 추적한다.
// 입력: 적용된 op + 기존 Pointer
// 출력: 새 Pointer (또는 null = cascading drop)

import {
  buildPointer,
  isPrefix,
  readAt,
  tryParsePointer,
  type Pointer,
} from "../pointer/core.js";
import { parseArrayIndex } from "../pointer/array-index.js";
import type { JSONPatchOperation } from "./contract.js";
import type { JSONValue } from "../protocol/contract.js";
import { applyOpRaw } from "./apply.js";

function isArrayIndex(seg: string): boolean {
  return parseArrayIndex(seg) !== null;
}

// at = parent + [pivotSeg]. target 이 같은 array 부모를 공유하고 그 위치의 인덱스가
// 영향 받으면 새 segment 배열을 반환. 그렇지 않으면 null.
//
// add 의 경우 delta = +1 (pivot >= insert 위치는 한 칸 밀림).
// remove 의 경우 delta = -1 (pivot > remove 위치는 한 칸 당겨짐).
//
// `at` 의 마지막 segment 가 array index 가 아니거나 "-" 이면 영향 없음.
function shiftArraySibling(at: string[], target: string[], delta: 1 | -1, before?: JSONValue): string[] | null {
  if (at.length === 0) return null;
  const pivotSeg = at[at.length - 1]!;
  if (pivotSeg === "-") return null;
  if (!isArrayIndex(pivotSeg)) return null;
  const parent = at.slice(0, at.length - 1);
  if (before !== undefined) {
    const container = readAt(before, parent);
    if (!container.ok || !Array.isArray(container.value)) return null;
  }
  if (target.length < at.length) return null;
  for (let i = 0; i < parent.length; i++) {
    if (parent[i] !== target[i]) return null;
  }
  const targetIdxSeg = target[parent.length]!;
  if (!isArrayIndex(targetIdxSeg)) return null;
  const pivot = Number(pivotSeg);
  const tIdx = Number(targetIdxSeg);
  if (delta === 1 && tIdx < pivot) return null;
  if (delta === -1 && tIdx <= pivot) return null;
  const next = [...target];
  next[parent.length] = String(tIdx + delta);
  return next;
}

// 한 op 가 한 pointer 에 어떤 영향을 주는가.
// null = pointer 자체가 cascading drop 됨.
function trackOne(pointer: Pointer, op: JSONPatchOperation, before?: JSONValue): Pointer | null {
  const target = tryParsePointer(pointer);
  if (target === null) return null;

  switch (op.op) {
    case "test":
      return pointer;

    case "add": {
      const at = tryParsePointer(op.path);
      if (at === null) return null;
      if (before !== undefined) {
        const parent = readAt(before, at.slice(0, -1));
        if ((at.length === 0 || (parent.ok && !Array.isArray(parent.value)))
          && isPrefix(at, target) && at.length < target.length) return null;
      }
      const shifted = shiftArraySibling(at, target, 1, before);
      return shifted ? buildPointer(shifted) : pointer;
    }

    case "remove": {
      const at = tryParsePointer(op.path);
      if (at === null) return null;
      // 동일 또는 자손이면 drop
      if (isPrefix(at, target)) return null;
      const shifted = shiftArraySibling(at, target, -1, before);
      return shifted ? buildPointer(shifted) : pointer;
    }

    case "replace": {
      const at = tryParsePointer(op.path);
      if (at === null) return null;
      // 자손은 cascading drop (값이 통째로 교체됨)
      if (isPrefix(at, target) && at.length < target.length) return null;
      // 동일 위치는 유지 (값만 바뀐 것)
      return pointer;
    }

    case "move": {
      const from = tryParsePointer(op.from);
      const to = tryParsePointer(op.path);
      if (from === null || to === null) return null;
      // from === target → to 로 이동
      if (from.length === target.length && isPrefix(from, target)) {
        return op.path;
      }
      // from prefix of target → 자손도 이동: from 부분을 to 로 치환
      if (isPrefix(from, target) && from.length < target.length) {
        const tail = target.slice(from.length);
        return buildPointer([...to, ...tail]);
      }
      // 그 외: remove(from) 적용 후 add(to) 적용으로 합성
      const afterRemove = trackOne(pointer, { op: "remove", path: op.from }, before);
      if (afterRemove === null) return null;
      const removed = before === undefined ? undefined : applyOpRaw(before, { op: "remove", path: op.from });
      if (removed && "error" in removed) return null;
      return trackOne(afterRemove, { op: "add", path: op.path, value: null }, removed?.state as JSONValue | undefined);
    }

    case "copy": {
      // copy 는 add 와 같은 영향 (target 위치에 새 노드)
      return trackOne(pointer, { op: "add", path: op.path, value: null }, before);
    }
  }
}

export function trackPointer(
  pointer: Pointer,
  applied: ReadonlyArray<JSONPatchOperation>,
  before?: JSONValue,
): Pointer | null {
  const segments = tryParsePointer(pointer);
  if (segments === null || (before !== undefined && !readAt(before, segments).ok)) return null;
  let cur: Pointer | null = pointer;
  let state = before;
  for (let index = 0; index < applied.length; index += 1) {
    if (cur === null) return null;
    const op = applied[index]!;
    cur = trackOne(cur, op, state);
    if (state !== undefined) {
      const result = applyOpRaw(state, op);
      if ("error" in result) return null;
      state = result.state as JSONValue;
    }
    // 방어: `/-` 가 결과 pointer 에 누출되면 broken — null 반환.
    // applyPatch 의 applied 는 normalizeOp 으로 이미 concrete index. 이 가드는 hand-built ops 보호용.
    if (cur !== null && (cur === "-" || cur.endsWith("/-"))
      && (state === undefined || !readAt(state, tryParsePointer(cur)!).ok)) return null;
  }
  return cur;
}
