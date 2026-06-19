# @interactive-os/json-document-paste-special

Lab extension for paste special.

Use it when a host receives a clipboard/import/drop payload that may need to be
adapted before it can be inserted into the current document.

## 1.0 status

1.0에서는 lab으로 유지한다. Core API 변경도 없고 official 승격도 보류한다.

이 package가 맡는 책임은 external payload adaptation boundary, insert/replace
capability check, execution error preservation이다. 실제 payload parsing,
product-specific adapter rule, TSV/HTML/schema mapping, autocomplete UI는 아직
host-owned로 남는다. 공통 adapter vocabulary가 더 수렴하기 전까지 official
surface로 얼리지 않는다.

## Scope

- let the host classify and adapt external payloads
- let the host attach insert options such as `spread` and `rekey`
- preflight the adapted payload through `doc.canInsert`
- execute through `doc.insert`
- return structured compatibility, capability, and execution errors

## Non-goals

- browser clipboard access
- text/HTML/TSV parsing
- product-specific payload schemas
- visual paste target selection
- custom ID policy beyond core `rekey`
- plugin registration
- `@interactive-os/json-document` internal imports

```ts
const paste = createPasteSpecial(doc, {
  adapt({ payload }) {
    if (isExternalCard(payload)) {
      return {
        ok: true,
        payload: {
          id: payload.id,
          title: payload.name,
          done: false,
        },
        options: {
          rekey: { fields: ["id"], strategy: "suffix" },
        },
      };
    }
    return { ok: false, code: "unsupported_payload", reason: "card payload expected" };
  },
});

const canPaste = paste.canPaste({ payload: externalPayload, target: "/cards/-" });
if (canPaste.ok) paste.paste(canPaste.input);
```

## Friction report

- Core `canInsert`/`insert` handles schema validation, discriminator checks,
  spread insert, and rekeying for external payloads.
- The missing feature-level boundary is not another core primitive. It is the
  repeated app code that adapts external payloads, chooses insert options, and
  preserves diagnostics.
- This lab should stay separate from `snippets`: snippets own known reusable
  payloads, while paste special owns unknown or cross-product payloads.
