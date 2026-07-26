# @interactive-os/json-document-clipboard-web

Web clipboard extension functions for `@interactive-os/json-document`.

```sh
npm install @interactive-os/json-document@2.0.0-rc.0 \
  @interactive-os/json-document-clipboard-web \
  zod
```

```ts
import { z } from "zod";
import {
  createJSONDocument as createJSONEditingSession,
} from "@interactive-os/json-document/session";
import { createWebClipboard } from "@interactive-os/json-document-clipboard-web";

const Schema = z.object({
  cards: z.array(z.object({
    id: z.string(),
    title: z.string(),
  })),
});
const session = createJSONEditingSession(Schema, {
  cards: [{ id: "a", title: "Draft" }],
});
const clipboard = createWebClipboard(session);

const copied = await clipboard.copy("/cards/0");
if (!copied.ok) {
  const reason = copied.reason;
}

const pasted = await clipboard.paste("/cards/-", {
  rekey: { fields: ["id"], strategy: "suffix" },
});
if (!pasted.ok) {
  const reason = pasted.reason;
}
```

This package is an extension. It does not add plugin registration to the core
document. Its current `0.1.x` API composes the Candidate Editing Session
`JSONDocument` with a small text clipboard host; it is not a six-member v2 Root
Projection adapter.

Candidate Session `session.clipboard` is the headless JSON payload buffer.
`@interactive-os/json-document-clipboard-web` is only the system clipboard
bridge. Zod is required when constructing that Session, while the v2 Root keeps
its Zod peer optional.

## Host

By default, `createWebClipboard(doc)` uses `navigator.clipboard` when available. Browsers usually require a secure context, user activation, focus, and/or permission for `readText` and `writeText`. Denied browser access returns a Result instead of throwing.

Tests, server rendering, and custom shells should inject a host:

The host shape is `{ readText, writeText }`.

```ts
const host = {
  text: "",
  readText() {
    return this.text;
  },
  writeText(text: string) {
    this.text = text;
  },
};

const clipboard = createWebClipboard(session, { host });
```

If the host is missing `readText`, read/paste/canPaste return `clipboard_unavailable`. If the host is missing `writeText`, copy/cut/writePayload return `clipboard_unavailable`.

## Methods

| Method | Role |
| --- | --- |
| `copy(source?, options?)` | `session.clipboard.copy` 후 text host에 JSON payload 쓰기 |
| `cut(source?, options?)` | host write 성공 뒤 `session.clipboard.cut` 실행 |
| `read()` | text host에서 읽고 json-document clipboard payload로 decode |
| `writePayload(payload, metadata?)` | document 변경 없이 payload를 text host에 쓰기 |
| `canPaste(target, options?)` | host text를 읽고 `session.canInsert(target, payload, options)` 실행 |
| `canPasteText(target, text, options?)` | 주어진 text로 `session.canInsert(target, payload, options)` 실행 |
| `paste(target, options?)` | host text를 읽고 `session.insert(target, payload, options)` 실행 |
| `pasteText(target, text, options?)` | 주어진 text로 `session.insert(target, payload, options)` 실행 |

All methods return json-document style Results. Check `.ok` before assuming success.

Paste targets are the Candidate Session clipboard targets: `"/items/-"`,
`{ before: pointer }`, `{ after: pointer }`, or `{ replace: pointer }`. Pass the
same insert options to `canPaste` and `paste`.

## Payload Format

The default codec stores a JSON text envelope:

```ts
{
  kind: "json-document.clipboard+json",
  version: 1,
  payload,
  source,
  sources,
}
```

Raw JSON text without the envelope is accepted as `payload` for paste. Provide a custom `codec` only when another app needs a different wire format.
