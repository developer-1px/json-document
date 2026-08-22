# Adapters

JSON Document와 Editing은 headless입니다. 브라우저 키보드, clipboard,
contenteditable root 같은 플랫폼 계약은 공식 Adapter가 번역합니다.
라이브러리 생태계 연결은 [Connectors](connectors.md)가 맡습니다.

## 패키지 선택하기

| 붙일 플랫폼 계약 | 패키지 | 제공하는 변환 |
| --- | --- | --- |
| Keyboard / Press | `@interactive-os/json-document-web` | Web event → semantic command 또는 Press fact |
| ARIA / Focus | `@interactive-os/json-document-web` | canonical widget state → ARIA·composite focus props |
| Clipboard | `@interactive-os/json-document-web` | `ClipboardEvent` → copy, cut, paste |
| Contenteditable | `@interactive-os/json-document-contenteditable` | contenteditable root ↔ JSON Document string pointer |

Keyboard와 Clipboard는 같은 패키지에 있지만 공식 표면은 각각입니다.
Adapter를 제거해도 canonical JSON과 Editing 의미는 바뀌지 않습니다.

## Keyboard adapter

`createWebKeyboardAdapter`는 공식 keyboard adapter입니다. 기본 keymap이
화살표, Delete, Mod+Z 같은 관례적 chord를 의미 command로 바꿉니다. host는
그 command를 Topology 이웃과 `editor.dispatch`로 이어 붙입니다.
React에서 그 결과를 범위·focus·text 커서로 그리려면
[React에서 선택과 커서 그리기](react-editing.md)의 `useEditing`을
씁니다.

```ts
const keyboard = createWebKeyboardAdapter();

surface.addEventListener("keydown", (event) => {
  const command = keyboard.resolve(event);
});
```

[/adapters/keyboard](/adapters/keyboard) 데모는 이 adapter가 기존 Intent,
Clipboard, History와 같은 문을 쓰는지 확인합니다. 화살표는 Selection만
바꾸고, Delete는 `selection.remove`로 History에 남으며, Mod+Z는
`undo()`를 호출합니다. 그 선택에서 copy/paste는 Clipboard adapter를
그대로 씁니다.

## Press와 ARIA projection

`pressInteractionFromWeb`은 Enter·Space·primary pointer·virtual click을 제품 action
없는 Press fact로 번역합니다. Affordance가 transient Press lifecycle을 닫고,
host가 role Intent를 고릅니다. Native button activation은 다시 구현하지 않습니다.

`projectWebWidgetState`는 canonical `selected`·`pressed`·`expanded`·`disabled`를
role에 맞는 ARIA state로 투영합니다. `activeDescendantContainerProps`와
`rovingFocusItemProps`는 composite focus 전략을 표현하지만 logical focus를
소유하지 않습니다. ARIA는 state의 출력이며 입력이나 실행 차단을 대신하지 않습니다.

## Clipboard adapter

`createWebClipboardBinding`은 브라우저 clipboard event를 editor의 copy,
cut, paste에 연결합니다.

```ts
const clipboard = createWebClipboardBinding({
  codec: documentClipboardCodec,
  read: () => editor.copy(),
  cut: () => editor.cut()?.result ?? { ok: false },
  paste: (payload) => editor.dispatch({
    type: "clipboard.paste",
    clipboard: payload,
  }),
});

surface.addEventListener("copy", (event) => clipboard.copy(event));
surface.addEventListener("cut", (event) => clipboard.cut(event));
surface.addEventListener("paste", (event) => clipboard.paste(event));
```

Document, Sheet, Order, Object, Tree, Database codec은 구조화된 MIME과
`text/plain`을 함께 기록합니다. Connector가 아니라 Adapter가 처리하지
않은 event는 브라우저의 기본 동작으로 이어집니다.
`selectionOperationFromModifiers`는 보조 키 입력을 `replace`, `extend`,
`toggle`로 바꿉니다. `textInputFromControl`은 브라우저 입력 요소의 값과
caret을 관찰합니다.

[/adapters/clipboard](/adapters/clipboard)에서 실제 ClipboardEvent와
modifier selection, text input을 연결합니다.

## Contenteditable adapter

Contenteditable Adapter는 local `JSONDocument`의 문자열 포인터를 React
contenteditable root에 붙입니다. IME와 native input 동안 그 root의
model→DOM render만 유예하고, 커밋은 여섯 member `document`로 들어갑니다.

```tsx
import { createJSONDocument } from "@interactive-os/json-document";
import { ContentEditable } from "@interactive-os/json-document-contenteditable";

const document = createJSONDocument({ title: "Shared title" });

<ContentEditable document={document} pointer="/title" />;
```

툴바, 슬래시 팔레트, 전송 버튼과 atom·marks 의미는 이 패키지에 없습니다.
[/adapters/contenteditable](/adapters/contenteditable)에서 두 필드를
동시에 붙여 다른 경로 변경이 leased root를 덮어쓰지 않는 모습을 볼 수
있습니다.

## 각 구성 요소가 맡는 값

| 구성 요소 | 맡는 값과 동작 |
| --- | --- |
| JSON Document | 현재 JSON 값, read, validation, commit, subscription |
| Editing | transaction, Selection, Clipboard, History |
| Adapter | 플랫폼 계약과 공개 API 사이의 변환 |
| Connector | 이름 있는 라이브러리 생태계와 공개 API 사이의 번역 |
| 제품 | UI, 제품별 의미, 입력과 외부 상태 조립 |
