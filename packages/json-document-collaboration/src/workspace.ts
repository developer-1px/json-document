import type { JSONValue } from "@interactive-os/json-document";
import { forkCompatibleHistoryRuntime } from "./create.js";
import { restoreHistoryRuntime } from "./restore.js";
import type { CollaborationRestoreOptions, HistoryRuntime, ReplicaStatus } from "./types.js";

export interface CollaborationParticipant {
  readonly runtime: HistoryRuntime;
  /** Advance the observed frontier. Remote changes do not advance it implicitly. */
  observe(): void;
  /** Merge locally authored changes, then observe the merged result. */
  publish(): { readonly ok: boolean; readonly code?: string; readonly collaboration: ReplicaStatus };
}

export interface CollaborationWorkspace {
  readonly runtime: HistoryRuntime;
  /** Checkpoint source, including history-only changes, suitable for durable storage. */
  readonly snapshot: { readonly value: JSONValue };
  subscribe(listener: () => void): () => void;
  /** One cached replica per actor; the shared runtime's actor is reserved. */
  participant(actorId: string): CollaborationParticipant;
}

/** Coordinate observed actor replicas without replacing the causal merge engine.
 * options.actorId names the shared runtime's actor. Options must match its ruleset.
 * A workspace owns actor lineages within one process; transports must enforce
 * exclusive authorship when sharing an actor identity across processes.
 */
export function createCollaborationWorkspace(runtime: HistoryRuntime, options: CollaborationRestoreOptions): CollaborationWorkspace {
  const participants = new Map<string, CollaborationParticipant>();
  let revision = -1;
  let snapshot: { readonly value: JSONValue };
  let currentRevision = 0;
  runtime.replica.subscribe(() => { currentRevision++; });
  return {
    runtime,
    get snapshot() {
      if (revision !== currentRevision) {
        snapshot = { value: runtime.replica.exportCheckpoint() as unknown as JSONValue };
        revision = currentRevision;
      }
      return snapshot!;
    },
    subscribe(listener) { return runtime.replica.subscribe(() => listener()); },
    participant(actorId) {
      if (actorId === options.actorId) throw new Error("The shared actor already has a live runtime");
      const existing = participants.get(actorId);
      if (existing) return existing;
      const forked = forkCompatibleHistoryRuntime(runtime, { ...options, actorId });
      const restored = forked ? { ok: true as const, runtime: forked }
        : restoreHistoryRuntime(runtime.replica.exportCheckpoint(), { ...options, actorId });
      if (!restored.ok) throw new Error(`${restored.code}: ${restored.reason}`);
      const local = restored.runtime;
      let observedRevision = currentRevision;
      const observe = () => {
        if (observedRevision === currentRevision) return;
        const observingRevision = currentRevision;
        const result = local.replica.ingest(runtime.replica.exportBundle());
        if (!result.ok) throw new Error(`${result.code}: ${result.reason}`);
        observedRevision = observingRevision;
      };
      const participant: CollaborationParticipant = {
        runtime: local, observe,
        publish() {
          const bundle = local.replica.exportBundle();
          const result = runtime.replica.ingest(bundle);
          if (!result.ok) return { ok: false, code: result.code, collaboration: runtime.replica.status() };
          observe();
          const status = runtime.replica.status();
          const ownChanges = [...result.integrated, ...result.pending].filter(id => id.actorId === actorId);
          const isOwn = (id: { actorId: string; counter: number }) => ownChanges.some(own => own.actorId === id.actorId && own.counter === id.counter);
          const targets = new Set<string>();
          const hidden = bundle.changes.filter(change => isOwn(change.changeId)).flatMap(change => change.ops).map(op => {
            const target = op.kind === "insert" ? op.member : op.kind === "move-to-root" ? op.root
              : op.kind === "set" || op.kind === "move" || op.kind === "text-splice" ? op.target : null;
            if (target !== null) targets.add(target);
            return target !== null && runtime.replica.locate(target) === null;
          }).some(Boolean);
          const suppressed = status.suppressed.some(item => isOwn(item.changeId));
          const pending = status.pending.some(item => isOwn(item.changeId));
          const conflict = status.conflicts.some(item => item.kind === "object-key"
            ? targets.has(item.winner) || item.alternatives.some(id => targets.has(id))
            : isOwn(item.winner) || item.alternatives.some(isOwn));
          return { ok: !suppressed && !pending && !conflict && !hidden,
            ...(suppressed ? { code: "collaboration.change-suppressed" } : pending ? { code: "collaboration.change-pending" } : conflict ? { code: "collaboration.conflict" } : hidden ? { code: "collaboration.target-hidden" } : {}),
            collaboration: status };
        },
      };
      participants.set(actorId, participant);
      return participant;
    },
  };
}
