import { useCallback, useState } from "react";
import type { AnnotationSnapshot } from "./annotation-state";

type AnnotationHistory = {
  readonly past: ReadonlyArray<AnnotationSnapshot>;
  readonly present: AnnotationSnapshot;
  readonly future: ReadonlyArray<AnnotationSnapshot>;
};

export function useAnnotationHistory(initial: AnnotationSnapshot) {
  const [history, setHistory] = useState<AnnotationHistory>({
    past: [],
    present: initial,
    future: [],
  });

  const commit = useCallback((next: AnnotationSnapshot) => {
    setHistory((current) => sameSnapshot(current.present, next) ? current : ({
      past: [...current.past, current.present],
      present: next,
      future: [],
    }));
  }, []);

  const replace = useCallback((next: AnnotationSnapshot) => {
    setHistory((current) => ({ ...current, present: next }));
  }, []);

  const finishTransient = useCallback((before: AnnotationSnapshot, next: AnnotationSnapshot) => {
    setHistory((current) => sameSnapshot(before, next) ? ({ ...current, present: next }) : ({
      past: [...current.past, before],
      present: next,
      future: [],
    }));
  }, []);

  const undo = useCallback(() => {
    setHistory((current) => {
      const previous = current.past.at(-1);
      if (previous === undefined) return current;
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((current) => {
      const next = current.future[0];
      if (next === undefined) return current;
      return {
        past: [...current.past, current.present],
        present: next,
        future: current.future.slice(1),
      };
    });
  }, []);

  return {
    snapshot: history.present,
    commit,
    replace,
    finishTransient,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}

function sameSnapshot(left: AnnotationSnapshot, right: AnnotationSnapshot): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
