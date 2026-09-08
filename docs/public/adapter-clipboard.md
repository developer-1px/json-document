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
  readonly cut?: (payload: Payload) => EditingResult | null;
  readonly paste: (payload: Payload) => EditingResult;
}
```

### 이벤트 소유권과 실패

| 동작 | `preventDefault()` 시점 |
| --- | --- |
| Copy | 모든 표현을 성공적으로 쓴 뒤 |
| Cut | cut callback·event clipboardData·payload를 확인한 뒤, 표현 인코딩/쓰기 전 |
| Paste | 지원하는 payload를 해석한 뒤, 편집 callback 호출 전 |

Cut의 표현 인코딩/쓰기가 실패하면 `clipboard.unavailable`을 반환하고 제거
callback을 호출하지 않습니다. 이미 취소한 native Cut을 다시 위임하지 않으므로
브라우저의 후속 삭제로 원본·선택·History가 바뀌지 않습니다. 모든 표현을 쓴
뒤에만 제거를 호출하며, 제거가 거절되면 `editing.rejected`를 반환합니다.
지원하는 Paste의 편집 거절도 취소한 이벤트를 다시 위임하지 않습니다.

Cut 미지원, clipboardData/payload 부재, Copy 쓰기 실패, 지원하지 않거나 유효하지
않은 Paste는 기존 native 위임을 유지합니다. 실패 전에 일부 clipboard 표현을
썼다면 그 데이터는 남을 수 있습니다. 이 API는 OS clipboard와 문서의 원자성을
보장하지 않습니다. [정본 owner의 계약과 검증](https://github.com/developer-1px/json-document/blob/main/packages/json-document-web/README.md#cut-failure-boundary-draft-grammar)에
단위·실제 브라우저 검증 경계를 함께 설명합니다.

## Live Demo

```live-demo
/adapters/clipboard
```
