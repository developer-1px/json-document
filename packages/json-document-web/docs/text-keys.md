# Native 문자 키 경계

`isWebComposingKey(event)`는 `isComposing` 및 keyCode 229를 native IME 입력으로 구분합니다. `webKeyboardText(stroke)`는 shortcut과 제어 키를 제외한 문자 payload를 반환합니다. 편집 시작·확정 의미는 Affordance가 결정합니다.

`moveGridPoint(topology, point, 'previous' | 'next')`는 기존 API로 행을 넘는 순차 셀 이동을 지원합니다. 끝에서는 null을 반환하며, 소비자가 문서 밖 이동이나 기본 Tab 흐름을 연결합니다. [Sheet Usage](/demo/sheet)는 별도의 좌표 계산 없이 이 계약을 사용합니다.
