import { performance } from 'node:perf_hooks';
import { createHistoryRuntime, restoreHistoryRuntime } from '../dist/history-index.js';
import { createCollaborationWorkspace } from '../dist/history-index.js';

const counts = (process.env.PERF_WORKSPACE_CHANGES ?? '20,100').split(',').map(Number);
for (const count of counts) {
  let validations = 0;
  const options = { actorId: 'human', epochId: 'workspace-perf', ruleset: { id: 'objects', digest: '1' },
    validate: () => { validations++; return { ok: true }; } };
  const runtime = createHistoryRuntime({ objects: Array.from({ length: 80 }, (_, id) => ({ id, x: 0, color: 'white' })) }, options);
  const workspace = createCollaborationWorkspace(runtime, options);
  const measure = (operation, run) => {
    validations = 0;
    const start = performance.now();
    const result = run();
    if (result?.ok === false) throw Error(`${operation}: ${result.code}`);
    console.log(JSON.stringify({ count, operation, ms: +(performance.now() - start).toFixed(3), validations }));
    return result;
  };
  for (let i = 1; i <= count; i++) {
    runtime.document.commit([{ op: 'replace', path: '/objects/0/x', value: i }]);
    if (i % 5 === 0) { runtime.history.undo(); runtime.history.redo(); }
  }
  const a = measure('join a', () => workspace.participant('agent-a'));
  const b = measure('join b', () => workspace.participant('agent-b'));
  measure('observe unchanged', () => a.observe());
  measure('agent a edit', () => a.runtime.document.commit([{ op: 'replace', path: '/objects/1/x', value: 10 }]));
  measure('agent b concurrent edit', () => b.runtime.document.commit([{ op: 'replace', path: '/objects/2/x', value: 20 }]));
  measure('publish b first', () => b.publish());
  measure('publish a reordered', () => a.publish());
  measure('observe merged', () => b.observe());
  measure('human continued edit', () => runtime.document.commit([{ op: 'replace', path: '/objects/3/x', value: 30 }]));
  measure('human undo', () => runtime.history.undo());
  measure('human redo', () => runtime.history.redo());
  measure('checkpoint', () => workspace.snapshot);
  const restored = restoreHistoryRuntime(workspace.snapshot.value, options);
  if (!restored.ok || JSON.stringify(restored.runtime.document.value) !== JSON.stringify(runtime.document.value)) throw Error('cold replay mismatch');
}
