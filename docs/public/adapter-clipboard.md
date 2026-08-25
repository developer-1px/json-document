# Clipboard Adapter Reference

Clipboard Adapter는 브라우저 clipboard event를 Editing의 copy, cut, paste에
연결합니다. 구조화된 MIME과 `text/plain`을 함께 기록하며, 처리하지 않은
event는 브라우저 기본 동작으로 돌려보냅니다.

## `createWebClipboardSurface`

React와 같은 event surface에는 `createWebClipboardSurface`가 copy, cut, paste
handler와 결과 관찰 지점을 함께 제공합니다.

```ts
const clipboardSurface = createWebClipboardSurface({
  codec: documentClipboardCodec,
  read: () => editor.copy(),
  cut: () => editor.cut()?.result ?? { ok: false },
  paste: (payload) => editor.dispatch({
    type: "clipboard.paste",
    clipboard: payload,
  }),
  onResult: (result) => {
    // Host가 product message, observation, local clipboard state를 결정합니다.
  },
});

<section {...clipboardSurface} />;
```

```ts
function createWebClipboardSurface<Payload, EditingResult>(
  options: WebClipboardBindingOptions<Payload, EditingResult> & {
    readonly onResult: (
      result: WebClipboardResult<Payload, EditingResult>,
    ) => void;
  },
): WebClipboardSurface<Payload, EditingResult>;

interface WebClipboardSurface<Payload, EditingResult> {
  readonly onCopy: (event: WebClipboardEvent) => WebClipboardResult<Payload, EditingResult>;
  readonly onCut: (event: WebClipboardEvent) => WebClipboardResult<Payload, EditingResult>;
  readonly onPaste: (event: WebClipboardEvent) => WebClipboardResult<Payload, EditingResult>;
}
```

모든 handler는 같은 binding lifecycle을 사용하고 결과를 `onResult`에 한 번
전달한 뒤 그 결과를 반환합니다. payload 의미, paste policy, 사용자 메시지와
관찰 상태는 Host 책임입니다.

## `createWebClipboardTextWriter`

버튼처럼 ClipboardEvent 밖에서 plain text를 쓰는 명령은 Async Clipboard API를
직접 호출하지 않고 별도 imperative writer를 사용합니다.

```ts
const writer = createWebClipboardTextWriter();
const result = await writer.writeText(payload.text);

if (!result.ok) announce(result.reason ?? result.code);
```

성공은 `{ ok: true }`, API 미지원은 `clipboard.unsupported`, permission·focus·
activation 등 write reject는 `clipboard.write-failed`로 정규화됩니다. 기본
clipboard instance는 `writeText` 호출 시점에 읽으며, owner test나 Host injection은
`{ clipboard }` option을 사용합니다. 이 operation은 domain payload, Editing
mutation, announcement나 실패 시 rollback을 소유하지 않습니다.

## `createWebClipboardBinding`

DOM listener를 직접 설치하거나 개별 operation을 호출해야 할 때 사용하는
저수준 API입니다.

```ts
function createWebClipboardBinding<Payload, EditingResult>(
  options: WebClipboardBindingOptions<Payload, EditingResult>,
): WebClipboardBinding<Payload, EditingResult>;

interface WebClipboardBindingOptions<Payload, EditingResult> {
  readonly codec: WebClipboardCodec<Payload>;
  readonly representations?: ReadonlyArray<WebClipboardRepresentation<Payload>>;
  readonly read: () => Payload | null;
  readonly cut?: (payload: Payload) => EditingResult;
  readonly paste: (payload: Payload) => EditingResult;
}
```

## Live Demo

```live-demo
/adapters/clipboard
```
