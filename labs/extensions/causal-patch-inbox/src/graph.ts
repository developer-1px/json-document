import type {
  StoredEnvelope,
} from "./envelope.js";

export interface IntroducedDependencyCycle {
  readonly id: string;
  readonly cycle: ReadonlyArray<string>;
}

export function findIntroducedDependencyCycle<TDocument>(
  additions: ReadonlyMap<string, StoredEnvelope<TDocument>>,
  existing: (id: string) => StoredEnvelope<TDocument> | undefined,
  hasExistingDependent: (id: string) => boolean,
): IntroducedDependencyCycle | null {
  const admitted = new Map<string, StoredEnvelope<TDocument>>();
  const admittedDependencyTargets = new Set<string>();
  const lookup = (id: string): StoredEnvelope<TDocument> | undefined => {
    return admitted.get(id) ?? existing(id);
  };

  for (const envelope of additions.values()) {
    if (
      hasExistingDependent(envelope.id)
      || admittedDependencyTargets.has(envelope.id)
    ) {
      for (const dependency of envelope.dependsOn) {
        const path = findDependencyPath(dependency, envelope.id, lookup);
        if (path !== null) {
          return {
            id: envelope.id,
            cycle: [...path, dependency],
          };
        }
      }
    }
    admitted.set(envelope.id, envelope);
    for (const dependency of envelope.dependsOn) {
      admittedDependencyTargets.add(dependency);
    }
  }
  return null;
}

function findDependencyPath<TDocument>(
  start: string,
  target: string,
  lookup: (id: string) => StoredEnvelope<TDocument> | undefined,
): string[] | null {
  if (start === target) return [start];

  interface Frame {
    readonly dependencies: ReadonlyArray<string>;
    next: number;
  }

  const first = lookup(start);
  if (first === undefined) return null;
  const visited = new Set([start]);
  const path = [start];
  const stack: Frame[] = [{
    dependencies: first.dependsOn,
    next: 0,
  }];

  while (stack.length > 0) {
    const frame = stack[stack.length - 1]!;
    const dependency = frame.dependencies[frame.next];
    if (dependency === undefined) {
      stack.pop();
      path.pop();
      continue;
    }
    frame.next += 1;
    if (dependency === target) return [...path, dependency];
    if (visited.has(dependency)) continue;
    visited.add(dependency);

    const envelope = lookup(dependency);
    if (envelope === undefined) continue;
    path.push(dependency);
    stack.push({
      dependencies: envelope.dependsOn,
      next: 0,
    });
  }
  return null;
}
