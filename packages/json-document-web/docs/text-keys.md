# Native 문자 키 경계

`isWebComposingKey(event)`는 `isComposing` 및 keyCode 229를 native IME 입력으로 구분합니다. `webKeyboardText(stroke)`는 shortcut과 제어 키를 제외한 문자 payload를 반환합니다. 편집 시작·확정 의미는 Affordance가 결정합니다.

`moveGridPoint(topology, point, 'previous' | 'next')`는 기존 API로 행을 넘는 순차 셀 이동을 지원합니다. 끝에서는 null을 반환하며, 소비자가 문서 밖 이동이나 기본 Tab 흐름을 연결합니다. [Sheet Usage](/demo/sheet)는 별도의 좌표 계산 없이 이 계약을 사용합니다.

`webKeyboardPlatform()`은 브라우저의 키보드 플랫폼을 `mac` 또는 `standard`로 판별합니다. 환경 정보를 인자로 주입할 수 있으며 SSR·알 수 없는 환경·Mac으로 보고되는 터치 iPad는 `standard`입니다. [Sheet Views Usage](/demo/sheet-views)의 SheetHand가 이 API로 Mac 입력 프로파일을 선택합니다.
