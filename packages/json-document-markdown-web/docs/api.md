## Markdown Web DOM 계약

생태계 위치는 **Adapter**입니다. `createMarkdownDOMAdapter()`는 contenteditable의
`TextDOMAdapter`를 구현합니다. 원문 텍스트와 DOM Selection의 UTF-16 offset이
같은 좌표계를 사용하며, 방향 있는 selection도 유지합니다.

`render(root, source, selection?)`는 strong 본문을 강조합니다. 선택이 strong 범위와
겹치면 해당 delimiter를 표시하고, 그 밖이나 `null`이면 숨깁니다.
숨겨진 delimiter도 text node로 남아 원문 위치를 보존합니다.
`observe`와 `restoreSelection`은 contenteditable의 정본 plain-text DOM 매핑을 사용합니다.
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

[실행 가능한 Usage](/demo/markdown-caret)의 source 탭에서 canonical 구현까지 확인합니다.
