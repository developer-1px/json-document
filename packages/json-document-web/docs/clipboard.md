## Web Clipboard · 이벤트 소유권

`createWebClipboardBinding`은 플랫폼의 copy/cut/paste와 구조화 payload codec을 연결합니다.
`createWebClipboardSurface`는 같은 binding의 `onCopy/onCut/onPaste`와 결과 관찰을 제공합니다.
정본 export는 `@interactive-os/json-document-web`에 있습니다. 도메인 객체와 ID·Selection·History는 Editing 소유입니다.

```ts
import { createWebClipboardBinding, objectClipboardCodec } from "@interactive-os/json-document-web";

const clipboard = createWebClipboardBinding({
  codec: objectClipboardCodec,
  read: () => editor.copy(),
  cut: (payload) => editor.dispatch({ type: "object.remove", objectIds: payload.objects.map((object) => object.id) }),
  paste: (payload) => editor.dispatch({ type: "clipboard.paste", clipboard: payload }),
});
```

- 기본 write는 codec의 구조화 MIME과 `text/plain`을 함께 기록합니다. `representations`를
  전달하면 지정한 표현 목록을 사용합니다. 전부 쓰기 성공한 뒤에만 `cut(payload)`를 호출합니다.
- cut callback이 있으면 쓰기 시도 **전에** native cut을 취소합니다. clipboard 없음·쓰기 거절·
  부분 쓰기·빈 선택·Editing 거절이 native fallback 삭제로 이어지지 않습니다. native editable
  target인지 판별하여 호출할 책임은 binding 소비자에게 있습니다. 미지원 cut callback은 이벤트를 소유하지 않습니다.
- `cut`은 `read`가 반환하고 실제 쓴 payload를 받습니다. 변경 가능한 현재 선택을 다시 읽지 말고
  이 캡처 대상을 제거합니다. clipboard의 여러 MIME 쓰기 자체는 OS 원자적 transaction이 아니므로
  앞 표현이 남고 뒤 쓰기가 실패할 수 있습니다. 이때도 도메인 문서는 삭제하지 않습니다.
- paste는 지원하는 MIME을 decode한 뒤 native event를 취소하고 Editing을 호출합니다.
  미지원/해독 불가 데이터는 `clipboard.empty/invalid`, 사용 불가는 `clipboard.unavailable`,
  Editing 거절은 `editing.rejected`로 관찰합니다. 미지원/해독 불가 paste의 기존 pass-through는 유지합니다.
- Mod+C/X/V keydown을 막으면 native clipboard event가 오지 않을 수 있습니다. 키 명령에서
  가상의 복사 동작을 만들지 않고 native 이벤트를 이 binding에 연결합니다.

실제 소비와 Source: [Canvas](/demo/canvas), [Object Demo](/demo/object),
[Clipboard Adapter](/adapters/clipboard). Canvas text/JSON textarea는 native clipboard를 유지합니다.

### 비동기 입력을 위한 동기 캡처

`captureWebClipboardPaste(event, { codec, files: true, text: true })`는 이벤트가 끝나기 전에
구조화 MIME → 파일 → `text/plain` 순서로 하나의 표현을 캡처합니다. 성공은 `type`이
`structured`(payload), `files`(파일 배열), `text`(문자열)인 결과입니다. files/text는 명시한
경우만 처리하며 기본은 구조화 표현뿐입니다. 파일 메타데이터는 별도 `fileCandidatesFromWebFiles`
API로 File Intake에 전달하고, 파일 참조는 실제 browser File이어야 읽을 수 있습니다.

캡처한 파일 배열과 문자열을 비동기 작업에 넘기며 ClipboardEvent/DataTransfer를 나중에 다시
읽지 않습니다. 자신이 처리하는 표현은 즉시 preventDefault합니다. 구조화 MIME이 있으면
decode 실패도 소유한 실패이며 다른 표현으로 떨어지지 않습니다. 이 strict 캡처는 위의 기존
동기 binding이 제공하는 여러 representation fallback/pass-through와 구분되는 계약입니다.
일치하는 표현이 없으면 native 처리를 막지 않고 `clipboard.empty`를 반환합니다.

`readWebRasterFile(file, { signal? })`는 기존 FileReader와 Image decode 정본입니다.
성공은 dataURL과 자연 width/height, 실패는 `raster.read-failed`, `raster.decode-failed`,
취소는 `raster.cancelled`입니다. 구조적 `WebRasterReadSignal`은 browser AbortSignal과
호환되며 read/decode 중 취소하면 리스너를 해제하고 읽기/이미지 요청을 중단합니다.
파일 형식·크기·개수·픽셀 제한이나 문서 객체 생성은 이 플랫폼 API의 책임이 아닙니다.

실제 텍스트·이미지 입력 및 순서/취소 연결: [Canvas Usage/Source](/demo/canvas).
