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
전달한 뒤 그 결과를 반환합니다. payload 의미와 문서 반영은 정본 Editing·Hand가
소유하며 Host는 제품 policy 값, 사용자 메시지와 관찰 표현을 주입합니다.

## 외부 이미지 입력 준비

`captureWebClipboardPaste(event, { codec?, files?, html?, text?, delegatedMimeTypes? })`는 event가 끝나기 전에
활성화한 표현을 한 번만 선택합니다. `html: "images"`를 켜면 구조화 → 파일 → 이미지가
포함된 HTML → 일반 텍스트 순입니다. `delegatedMimeTypes`는 기존 중첩 binding의 MIME을
캡처 전에 위임합니다. Codec과 text를 생략한 `{ files: true, html: "images" }`는 이미지
입력을 처리하고 이미지 없는 text·HTML은 기존 Rich Text binding에 남깁니다.
`readWebRasterFiles`는 선택한 파일 batch의 정책·PNG/JPEG/WebP decode를 검증하고
실제 내용과 크기를 반환합니다. 이 단계는 문서나 History를 변경하지 않습니다.
`parseWebClipboardHTML`은 inert fragment에서 글·이미지 순서를 읽고,
`readWebHTMLClipboard`는 포함된 raster data URL을 같은 정책·decode 경로로 준비합니다.
외부 URL은 요청하지 않으며 읽을 수 없는 source는 전체 실패입니다.

API 계약은 소유 패키지의 [Web API](/docs/api/web)에 있으며
[Canvas](/demo/canvas)와 [Composer](/demo/composer)가 같은 준비 경로를 사용합니다.
HTML의 남은 source·혼합 입력과 외부 앱 왕복은 [Paste × Image TBD](clipboard.md#paste--image-기본기--tbd)에
구현 범위와 구분해 공개합니다.

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
cut callback이 있으면 write 전에 native event를 취소합니다. 쓰기 실패에도 브라우저의
기본 삭제로 넘어가지 않으며, 전부 쓴 payload의 캡처 대상만 callback으로 제거합니다.
상세 실패·native editable 계약은 소유 패키지의 [Web Clipboard API](/docs/api/web)에 있습니다.

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
