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

### 입력 소유권과 실행 준비

`createWebClipboardSurface`는 DOM 이벤트의 `currentTarget`을 편집 root로 사용합니다.
기존 `isWebEditingHostTarget`으로 중첩 input·textarea·select·contenteditable 경계를
제외하며 SVG root도 지원합니다. 다른 소유자 또는 이미 취소된 이벤트에는 `null`을
반환하고 read·command·onResult를 호출하지 않습니다. target/currentTarget 없는
기존 programmatic 호출은 호출자가 소유권을 확정했다는 binding 전제를 유지합니다.

`routeWebClipboardEvent(root, event, operation, handle)`은 Canvas와 Rich Text처럼
준비·selection 동기화가 필요한 소비자도 같은 경계를 소비하게 합니다. 소유한 Cut은
handle 호출 전에 취소하므로 준비가 예외를 던져도 native 삭제로 넘어가지 않습니다.
Copy/Paste의 취소 시점은 기존 binding 또는 capture API에 남깁니다. `handle`의 결과를
그대로 반환하고 다른 편집영역·이미 취소된 이벤트에는 `null`을 반환합니다.

```ts
import { routeWebClipboardEvent } from "@interactive-os/json-document-web";
routeWebClipboardEvent(root, event, "cut", () => {
  syncSelection();
  return clipboard.cut(event);
});
```

앱 소유의 빈 선택·clipboard 없음·읽기/인코딩/쓰기 실패는 소유한 실패입니다.
DOM surface는 Cut callback이 없어도 앱 소유 이벤트를 취소합니다. 저수준 binding을
직접 호출하면 기존 미지원 callback 결과·취소 계약을 유지합니다. binding은 실제 쓴
동일 payload를 cut callback에 전달하며 consumer는 그 캡처 대상을 제거해야 합니다.
이미 처리된 child 이벤트는 parent에서 다시 실행하지 않습니다.

실제 Usage/Source: [Clipboard Adapter](/adapters/clipboard), [Canvas](/demo/canvas),
[Rich Text](/editing/rich-text). 앱 선택이 남은 중첩 native 입력, 준비 실패, SVG 내부
textarea, child/parent 단일 실행은 Web 소유 테스트로 검증합니다.

### 비동기 입력을 위한 동기 캡처

`captureWebClipboardPaste(event, { codec, files: true, text: true })`는 이벤트가 끝나기 전에
구조화 MIME → 파일 → `text/plain` 순서로 하나의 표현을 캡처합니다. 성공은 `type`이
`structured`(payload), `files`(파일 배열), `text`(문자열)인 결과입니다. files/text는 명시한
경우만 처리합니다. `codec`을 생략한 `{ files: true }`는 file-only 소비자를
지원하며 텍스트/HTML의 native 처리를 소유하지 않습니다. 파일 메타데이터는 별도 `fileCandidatesFromWebFiles`
API로 File Intake에 전달하고, 파일 참조는 실제 browser File이어야 읽을 수 있습니다.

캡처한 파일 배열과 문자열을 비동기 작업에 넘기며 ClipboardEvent/DataTransfer를 나중에 다시
읽지 않습니다. 자신이 처리하는 표현은 즉시 preventDefault합니다. 구조화 MIME이 있으면
decode 실패도 소유한 실패이며 다른 표현으로 떨어지지 않습니다. 이 strict 캡처는 위의 기존
동기 binding이 제공하는 여러 representation fallback/pass-through와 구분되는 계약입니다.
일치하는 표현이 없으면 native 처리를 막지 않고 `clipboard.empty`를 반환합니다.

`html: "images"`를 명시하면 파일 다음, 일반 텍스트 전에 이미지가 포함된 HTML을
선택합니다. 이 overload는 기존 결과에 `{ ok: true, type: "html", content }`를 더합니다.
이미지가 없는 HTML은 캡처하지 않으며 `text`를 켜지 않은 소비자는 기존 Rich Text 처리를
유지합니다. `delegatedMimeTypes`에 지정한 MIME이 있으면 모든 캡처보다 먼저
`clipboard.empty`로 위임하고 이벤트를 소유하지 않습니다. Composer는 내부 Rich Text
구조화 MIME을 이렇게 기존 binding에 남깁니다. 위임할 실제 binding이 있는 경우에만 지정합니다.

`readWebRasterFile(file, { signal? })`는 기존 FileReader와 Image decode 정본입니다.
성공은 dataURL과 자연 width/height, 실패는 `raster.read-failed`, `raster.decode-failed`,
취소는 `raster.cancelled`입니다. 구조적 `WebRasterReadSignal`은 browser AbortSignal과
호환되며 read/decode 중 취소하면 리스너를 해제하고 읽기/이미지 요청을 중단합니다.
파일 형식·크기·개수·픽셀 제한이나 문서 객체 생성은 이 플랫폼 API의 책임이 아닙니다.

### 이미지 batch 준비

`readWebRasterFiles(files, { policy, maxImagePixels, signal?, readRaster? })`는 File Intake의
정책 검사를 먼저 실행한 뒤 PNG/JPEG/WebP를 순서대로 decode합니다. 성공은
`{ ok: true, files: [{ candidate, image }] }`이며 image는 File Intake의 `RasterImageContent`입니다.
한 파일이라도 실패하면 전체 batch의 실패만 반환합니다. 파일 정책 실패, `raster.unsupported`,
읽기/decode 실패, `raster.pixel-limit`, `raster.cancelled`를 구별합니다.

`policy`와 `maxImagePixels`는 소비자가 결정합니다. 이 함수는 실제 DOM 읽기를
순차화하지만 문서를 변경하거나 Undo 단위·삽입 위치를 결정하지 않습니다. 준비한
batch를 어떻게 적용하고 언제 취소할지는 Editing과 각 Hand가 소유합니다.

### HTML 이미지와 순서 있는 내용

`parseWebHTMLFragment(html)`은 브라우저의 inert `template`에서 HTML 문법을 읽습니다.
`script`·`iframe`·`style`·SVG 등의 요소를 제외하고, DOM 순서의 `childNodes`를 가진
`WebHTMLFragment` 또는 빈/DOM 미지원 환경에서 `null`을 반환합니다. 반환 노드는 live DOM에
삽입하지 않습니다. 이 API는 문서 의미로 변환할 입력이지, 임의 HTML을 삽입하는 sanitizer가
아닙니다. Rich Text Web도 같은 parser를 사용하되 block·mark·schema 변환은 직접 소유합니다.

`parseWebClipboardHTML(html)`은 `{ parts }` 또는 `null`을 반환합니다. 각 part는
`{ type: "text", text }` 또는 `{ type: "image", source, label }`이며 HTML 내부의 순서를
유지합니다. block·`br`의 줄바꿈과 table cell 경계를 일반 텍스트로 옮기며 서식·CSS 배치는
보존하지 않습니다. 문자열 16,777,216 UTF-16 code unit, 탐색 노드 10,000개, part 256개를
넘으면 `RangeError`입니다. opt-in capture에서 이 실패는 `clipboard.invalid`로 소유하며
일반 텍스트로 조용히 떨어지지 않습니다.

`readWebHTMLClipboard(content, { policy, maxImagePixels, currentCount?, signal?, readRaster? })`는
PNG/JPEG/WebP base64 data URL만 준비합니다. 모든 source의 형식과 byte 수·파일 정책을
검사한 뒤 실제 bytes를 할당하고 `readWebRasterFiles`로 decode합니다. 성공 결과의
`parts`는 text 또는 `{ type: "image", candidate, image }`입니다. 하나라도 실패하면
일부 part를 돌려주지 않으며 기존 raster/파일 오류와 `raster.source-unsupported`를 구분합니다.
외부·상대·blob·cid URL은 다운로드하지 않습니다. 빈 source와 읽을 수 없는 이미지도 실패입니다.

Canvas는 이 결과를 Editing의 순서 있는 객체 변환으로 전달합니다. Composer는 이미지-only
HTML만 첨부로 받으며 글+이미지 입력은 `composer.clipboard.mixed-unsupported`로 전체를 거절합니다.
native 파일이 함께 있으면 파일 표현이 우선합니다. 파일과 HTML 이미지의 대응을 추측하거나
같은 내용을 두 번 추가하지 않으며, 두 표현의 혼합 의미 보존은 아직 TBD입니다.

실제 텍스트·이미지 입력 및 순서/취소 연결: [Canvas Usage/Source](/demo/canvas),
[Composer Usage/Source](/demo/composer). HTML의 남은 표현 범위, 명시적인 plain paste, 이미지 쓰기와
OS-native 왕복의 남은 범위는 [Clipboard 기본기 TBD](/docs/clipboard)에 공개합니다.
