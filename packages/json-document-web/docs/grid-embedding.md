# 내장 표의 좌표와 클립보드

표 상호작용을 다른 화면 안에 배치할 때 `projectWebClientDeltaToElement`가 화면 delta를 요소의 layout 좌표로 바꿉니다. CSS scale과 SVG foreignObject viewport 배율을 포함하며 회전/skew는 대상이 아닙니다. `sheetClipboardRepresentations`는 내부 Sheet JSON을 우선 읽고 외부 `text/plain`을 Editing의 표 텍스트 parser로 전달합니다. 두 API는 SheetHand와 Canvas 표 Usage에서 소비합니다.

`sheetClipboardRepresentations`를 `createWebClipboardSurface`에 넘기면 내부 JSON을 우선 읽고, 일반 텍스트를 Sheet 행렬로 변환합니다. 화면이 작아져도 문서에 저장하는 행열 크기는 바뀌지 않도록 리사이즈 시작값은 layout 크기, 포인터 이동값은 변환한 delta를 사용합니다.
