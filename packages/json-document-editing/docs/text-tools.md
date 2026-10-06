# Text editing tools

`applyTextEdit(editor, { source, before, after })`는 읽었던 원문과 현재 원문이 같은지
검사한 뒤 정확히 한 번 나타나는 `before`를 `after`로 교체합니다. 빈 `before`는
끝에 추가합니다. `TextEditor.replace`를 사용하므로 기존 Undo로 되돌릴 수 있습니다.
원문 변경, 중복 구절, 없는 구절은 수정하지 않고 오류 코드를 반환합니다.

`createTextEditorTools(editor)`는 모델에 전달할 `name`, `description`, `parameters`와
로컬 실행 함수 `execute`를 가진 `read_document`, `edit_document` 도구를 반환합니다.
읽기 결과에는 Markdown 원문과 선택 범위가 포함됩니다. 편집 전 읽기가 필요하며
성공한 편집은 다음 편집의 기준 원문을 갱신합니다. 문서는 브라우저에 유지됩니다.

```ts
import { createTextEditorTools } from "@interactive-os/json-document-editing";
const tools = createTextEditorTools(editor);
const source = tools[0].execute({});
const result = tools[1].execute({ before: "", after: "\n\n새 문단" });
```

Usage: [Bear](/applications/bear). 개발 서버에서 채팅이 표시되며 기존 Codex 로그인으로
도구를 호출합니다. 정적 배포에서는 로컬 에이전트 채팅이 표시되지 않습니다.
