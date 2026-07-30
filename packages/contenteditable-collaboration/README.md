# json-document-contenteditable-collaboration

IME-safe native-input DOM lease for
`@interactive-os/json-document-collaboration/text`.

The adapter binds one collaborative string pointer to one contenteditable
root. Collaboration ingestion and the seven-member document model always update
immediately. While the browser owns native input or IME composition, only
rendering back into that root is delayed.

Canonical DOM adapter와 lease vocabulary는
[Concept and Naming Standard](../../docs/standard/concept-and-naming-standard.md)가
정의합니다. `TextDOMAdapter`는 canonical public identifier이고
`CollaborationTextDOM`은 deprecated compatibility alias입니다.

```ts
import {
  createTextRuntime,
} from "@interactive-os/json-document-collaboration/text";
import {
  createContentEditableAdapter,
} from "@interactive-os/json-document-contenteditable-collaboration";

const runtime = createTextRuntime(
  { title: "Shared title" },
  {
    actorId: "browser-a",
    epochId: "document-42/v1",
    ruleset: {
      id: "example/document",
      digest: "example/document/v1",
    },
  },
);

const adapter = createContentEditableAdapter({
  runtime,
  pointer: "/title",
  root: document.querySelector("[contenteditable]") as HTMLElement,
});

const unbind = adapter.bind();
```

`bind()` renders the current string, binds native input/composition events,
and subscribes to `runtime.document`. Use `cancel()` to discard an in-flight
DOM mutation and render the latest model. `reset()` clears all local lease and
tail state and resynchronizes the root.

## Input boundary

- `beforeinput` or `compositionstart` captures the causal text basis before
  the browser mutates DOM.
- Intermediate composing `input` events never author Changes.
- `compositionend` performs one plan and one commit.
- A browser's trailing composition `input` is consumed without a second
  commit; a timer releases the native-input DOM lease when that event is absent.
- A cancelled `beforeinput` that produces no `input` releases its native lease
  on the next task instead of leaving DOM rendering stuck.
- Remote Changes update the model immediately but cannot replace the leased
  DOM root.
- Tail rendering rebases the local selection through remote text merges
  before restoring it.
- Atomic reset, deleted target, stale capture/plan, and invalid UTF-16
  selection offsets fail closed and render the latest model instead of
  resurrecting observed DOM.

The default DOM adapter stores plain text, serializes `<br>` and ordinary
block boundaries as deterministic `\n`, and preserves anchor/focus direction.
Restored offsets are clamped to the current string without landing inside a
surrogate pair. Events owned by nested editable roots or independent form
controls are not consumed by the parent adapter.

Wrappers or rich DOM can provide an adapter:

```ts
const adapter = createContentEditableAdapter({
  runtime,
  pointer: "/title",
  root,
  dom: {
    observe(root) {
      return {
        value: readVisibleText(root),
        selection: readUTF16Selection(root),
      };
    },
    render(root, value) {
      renderRichText(root, value);
    },
    restoreSelection(root, selection) {
      return restoreUTF16Selection(root, selection);
    },
  },
});
```

The custom DOM adapter must use DOM/JavaScript UTF-16 offsets and must not
author document changes while rendering.

## Package boundary

This package does not activate or depend on the archived 1.x DOM adapters. It
does not own transport, presence, clipboard, shared selection, rich-text schema
semantics, or React rendering. A framework renderer must not replace the same
root independently while this adapter owns it.
