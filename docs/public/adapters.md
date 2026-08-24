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
| Clipboard | `@interactive-os/json-document-web` | [Clipboard](adapter-clipboard.md) |
| Contenteditable | `@interactive-os/json-document-contenteditable` | [Contenteditable](adapter-contenteditable.md) |

Keyboard와 Clipboard는 같은 package에 있지만 서로 다른 플랫폼 계약을
번역합니다. 제품은 필요한 Adapter만 붙입니다.

## 경계

Adapter는 `KeyboardEvent`, `ClipboardEvent`, contenteditable DOM lifecycle처럼
host마다 다른 입력을 받습니다. Selection, Clipboard payload, History 같은
편집 의미는 Editing이 맡고, React나 Zod처럼 이름 있는 라이브러리와의 연결은
[Connector](connectors.md)가 맡습니다.
