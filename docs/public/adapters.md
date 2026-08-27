# Adapters

JSON Document와 Editing은 브라우저 event를 직접 해석하지 않습니다. Adapter는
플랫폼 계약을 공개 API가 받는 값으로 번역합니다. Adapter를 교체하거나
제거해도 canonical JSON과 Editing의 의미는 바뀌지 않습니다.

## 공식 Adapter

| 계약 | package | 문서 |
| --- | --- | --- |
| Keyboard / Press / ARIA | `@interactive-os/json-document-web` | [Keyboard](adapter-keyboard.md) |
| Grid cell address | `@interactive-os/json-document-web` | [Grid cell](adapter-grid-cell.md) |
| Pointer / Drag and Drop session | `@interactive-os/json-document-web` | [Interaction](adapter-interaction.md) |
| SVG coordinate / Raster source / Annotation raster | `@interactive-os/json-document-web` | [Hands](hands.md) |
| Clipboard | `@interactive-os/json-document-web` | [Clipboard](adapter-clipboard.md) |
| Virtual Selection | `@interactive-os/json-document-web`, `@interactive-os/json-document-react` | [Virtual Selection](adapter-virtual-selection.md) |
| Contenteditable | `@interactive-os/json-document-contenteditable` | [Contenteditable](adapter-contenteditable.md) |

Keyboard, Interaction, Clipboard, Virtual Selection은 같은 package family에 있지만 서로 다른 플랫폼 계약을
번역합니다. 제품은 필요한 Adapter만 붙입니다.

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
