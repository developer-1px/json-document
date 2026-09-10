## Markdown Web DOM 계약

생태계 위치는 **Adapter**입니다. `createMarkdownDOMAdapter()`는 contenteditable의
`TextDOMAdapter`를 구현합니다. 원문 텍스트와 DOM Selection의 UTF-16 offset이
같은 좌표계를 사용하며, 방향 있는 selection도 유지합니다.

`render(root, source, selection?)`는 strong 본문을 강조합니다. 선택이 strong 범위와
겹치면 해당 delimiter를 표시하고, 그 밖이나 `null`이면 숨깁니다.
숨겨진 delimiter도 text node로 남아 원문 위치를 보존합니다.
`observe`와 `restoreSelection`은 contenteditable의 정본 plain-text DOM 매핑을 사용합니다.
마지막 빈 줄의 caret 공간도 contenteditable의 `renderTextCaretBoundary`로 생성합니다.
이 DOM 요소는 source에 포함되지 않으며 빈 줄 뒤의 native 입력 위치를 보존합니다.
HTML은 `textContent`로 삽입하는 원문이며 HTML로 실행하지 않습니다.

```ts
import { createJSONDocument } from "@interactive-os/json-document";
import { createTextEditor } from "@interactive-os/json-document-editing";
import { createContentEditableBinding } from "@interactive-os/json-document-contenteditable";
import { createMarkdownDOMAdapter } from "@interactive-os/json-document-markdown-web";

const document = createJSONDocument("A **source**");
const editor = createTextEditor(document);
const binding = createContentEditableBinding({
  document, pointer: "", editor, root,
  dom: createMarkdownDOMAdapter(),
});
const dispose = binding.bind();
// dispose() releases DOM listeners and native leases.
```

직접 `render`를 native 입력 중 호출하지 않습니다. binding이 composition 동안 DOM을
브라우저에 맡기며, 완료 시 관측값을 한 번의 Editing transaction으로 반영합니다.
같은 source가 그동안 바뀌면 stale 입력을 거절하고 최신 정본을 복원합니다.
여러 사용자의 동시 문자열 편집을 병합하는 계약은 제공하지 않습니다.

## 변경 비용

원문 변경은 Editing의 `diffText`로 추출하여 Markdown의 `createMarkdownParser.update`에
전달합니다. 이전 문법 상태와 영향 없는 source run을 재사용하고, 바뀐 블록의 문법 경계를
정렬한 뒤 한 번 순회해 새 run을 만듭니다. 앞뒤의 같은 구간은 기존 DOM 요소와 Text node를 재사용합니다.
강조 구간 수를 S라고 하면 구간 구성은 O(S log S)이며 구간마다 모든 강조를 검색하지 않습니다.
원문 offset은 내부 run에 보관하고, 이동한 모든 요소에 offset 속성을 다시 쓰지 않습니다.

선택만 바뀌면 파싱·DOM 재구성을 하지 않습니다. 전체 `innerHTML` 직렬화 대신
MutationObserver로 native DOM 변경을 추적합니다. native 서식·자식 요소가 변했으면
같은 원문이어도 다음 render에서 복원합니다. 원문 위치 매핑은 contenteditable의
DOM 변경 단위 캐시를 공유합니다. 문법이 불확실할 때의 전체 파싱과 초기 DOM 생성,
원문 diff·run 순회·브라우저 layout의 문서 크기 비용은 남습니다.

[재현 가능한 성능 검사](performance.md)는 입력 지연과 History 보관량을 함께 측정합니다.

[실행 가능한 Usage](/demo/markdown-caret)의 source 탭에서 canonical 구현까지 확인합니다.
