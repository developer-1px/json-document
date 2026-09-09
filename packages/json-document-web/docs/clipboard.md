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
