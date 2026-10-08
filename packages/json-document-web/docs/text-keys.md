# Native 문자 키 경계

`isWebComposingKey(event)`는 `isComposing` 및 keyCode 229를 native IME 입력으로 구분합니다. `webKeyboardText(stroke)`는 shortcut과 제어 키를 제외한 문자 payload를 반환합니다. 편집 시작·확정 의미는 Affordance가 결정합니다.

`moveGridPoint(topology, point, 'previous' | 'next')`는 기존 API로 행을 넘는 순차 셀 이동을 지원합니다. 끝에서는 null을 반환하며, 소비자가 문서 밖 이동이나 기본 Tab 흐름을 연결합니다. [Sheet Usage](/demo/sheet)는 별도의 좌표 계산 없이 이 계약을 사용합니다.

`webKeyboardPlatform()`은 브라우저의 키보드 플랫폼을 `mac` 또는 `standard`로 판별합니다. 환경 정보를 인자로 주입할 수 있으며 SSR·알 수 없는 환경·Mac으로 보고되는 터치 iPad는 `standard`입니다. [Sheet Views Usage](/demo/sheet-views)의 SheetHand가 이 API로 Mac 입력 프로파일을 선택합니다.


## 언어와 무관한 물리 단축키

`createWebKeyboardAdapter({ keySource: "code", ... })`는 `KeyboardEvent.code`의
`KeyA`–`KeyZ`, `Digit0`–`Digit9`를 키맵의 문자·숫자로 해석합니다. 한글 모드의
`key: "ㄱ"` 또는 `key: "Process"`라도 `code: "KeyR"`이면 `r`에 연결합니다.
수정 키는 유지하고, 나머지 키와 code가 없는 입력은 기존 key 해석을 사용합니다.
기본값은 `keySource: "key"`이므로 텍스트 입력용 기존 소비자는 바뀌지 않습니다.
`isComposing: true`는 항상 무시합니다. legacy `keyCode: 229`는 code 모드에서
유효한 물리 문자·숫자 키가 있을 때만 단축키로 해석합니다. React에서는
`event.nativeEvent`를 전달해 이 입력 사실을 보존합니다.
편집 가능한 대상과 이벤트 소비는 호출하는 Hand가 판단합니다.

```ts
const tools = createWebKeyboardAdapter({
  defaults: false,
  keySource: "code",
  keymap: { r: "rectangle", "Shift-t": "table" },
});
```

[Canvas Application](/applications/canvas)의 `CanvasHand`가 이 API를 사용합니다.
Canvas API의 Usage/Source에서 정본 Web keyboard 모듈까지 확인할 수 있습니다.
