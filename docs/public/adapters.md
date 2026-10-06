# Adapters

JSON Document와 Editing은 브라우저 event를 직접 해석하지 않습니다. Adapter는
플랫폼 계약을 공개 API가 받는 값으로 번역합니다. Adapter를 교체하거나
제거해도 canonical JSON과 Editing의 의미는 바뀌지 않습니다.

## 플랫폼 계약과 모듈

위의 현재 제공 모듈은 실제 API 등록에서 구성합니다. Web의 keyboard·pointer·
clipboard·geometry, Contenteditable의 입력·선택, Rich Text Web·Markdown Web의
문서별 DOM 대응을 같은 Adapter 위치에서 찾습니다. 협업 Contenteditable은
플랫폼 입력 연결과 Collaboration profile에 함께 관련됩니다.

하나의 패키지에도 여러 독립 플랫폼 계약이 있습니다. 각 API 문서에서 계약과
Usage를 확인하고, Usage의 Source에서 정본 구현으로 이동합니다.

## SVG와 Raster

`projectWebClientPointToSVG`는 client rect와 viewBox 사이 좌표만 투영하고,
`readWebRasterFile`은 FileReader와 image decode 결과를 data URL 및 natural size로
번역합니다. `renderWebAnnotationRaster`는 Annotation domain에 종속된 이름 있는
Web adapter로 point·rectangle·path·arrow selector를 Canvas output에 합성합니다.
CSS token 선택, source ID, 파일명과 download 동작은 Host에 남습니다.

## 경계

Adapter는 `KeyboardEvent`, `ClipboardEvent`, contenteditable DOM lifecycle처럼
host마다 다른 입력을 받습니다. Selection, Clipboard payload, History 같은
편집 의미는 Editing이 맡고, React나 Zod처럼 이름 있는 라이브러리와의 연결은
[Connector](connectors.md)가 맡습니다.
