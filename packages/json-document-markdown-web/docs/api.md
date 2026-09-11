## Markdown Web DOM 계약

생태계 위치는 **Adapter**입니다. `createMarkdownDOMAdapter()`는 contenteditable의
`TextDOMAdapter`를 구현합니다. 원문 텍스트와 DOM Selection의 UTF-16 offset이
같은 좌표계를 사용하며, 방향 있는 selection도 유지합니다.

`render(root, source, selection?)`는 CommonMark/GFM 트리를 원문 보존 DOM으로 표시합니다.
제목 단계, 중첩 강조, 링크·이미지, 코드, 목록·인용, 표·정렬, task 상태를 반영합니다.
제목은 편집 중에도 제목 스타일을 유지하며 접두사·닫는 `#`·Setext 밑줄을 숨깁니다.
왼쪽 여백의 `H1`~`H6`는 CSS 표시이며 DOM text와 복사 원문에 추가되지 않습니다.
ATX 제목의 접두사 `# `는 `display: none`으로 제거하지 않고 표시 아래 투명한 원문으로
배치합니다. `#` 구간과 실제 H 표시 요소는 contenteditable의 공용
`createTextProjectionDOMAdapter`에 전달합니다. 방향키는 마커 앞·뒤·본문 시작을 이동하고,
커서는 마커 요소의 좌우 끝에 맞춰 표시합니다. 제목 마커 내부를 글자별로 이동하지 않습니다.
공용 `restoreSelection`의 affinity가 본문 시작 위치를 선택하므로 Markdown은 DOM Selection을
직접 다시 설정하지 않습니다. 키 해석은 Web keyboard adapter, 선택 적용과 IME lease는
contenteditable binding, 입력·삭제·실행 취소는 기존 Editing History가 담당합니다. `#`를 추가하거나 지우면
파서가 제목 단계를 다시 계산하며, 마지막 `#`를 지우면 일반 문장으로 바뀝니다.
닫는 `#`와 Setext 밑줄은 기존 숨김 표현을 유지합니다.
접근성은 기존 `role="heading"`, `aria-level`이 전달하고, 표시에는 빈 대체 텍스트를 사용합니다.
다른 문법은 선택이 범위와 겹치면 해당 원문 기호를 드러냅니다. 표는 선택 중 원문 행·구분선을
보여주며 밖에서는 셀로 표시합니다. 코드·escape·entity는 선택 밖에서 해석된 값을 표시합니다.
목록·인용 기호와 참조 정의는 글의 의미를 유지하도록 원문으로 표시합니다.
숨긴 원문도 text node로 남고, 이미지나 표시 전용 값은 source에 텍스트를 추가하지 않습니다.

기본 표현은 public CSS를 한 번 import합니다. `--markdown-muted`, `--markdown-accent`,
`--markdown-code-background`, `--markdown-border`, `--text-projection-caret` 변수로 제품 semantic token을 주입합니다.
사이트와 Bear가 같은 스타일을 소비합니다. `data-markdown-kind`, `data-markdown-active`,
`data-markdown-delimiter`가 문법·편집 상태를 나타냅니다.

`observe`와 `restoreSelection`은 contenteditable의 정본 plain-text DOM 매핑을 사용합니다.
마지막 빈 줄은 `renderTextCaretBoundary`가 담당합니다. 링크는 편집 중 클릭으로 이동하지
않고 Ctrl/⌘ 클릭으로 엽니다. 이미지 URL과 링크 URL에는 허용된 scheme만 사용합니다.
HTML은 실행하지 않는 원문으로 표시합니다. 체크 상태는 원문의 `[ ]`/`[x]`를 편집하며,
목록 자동 이어쓰기나 Tab 들여쓰기 같은 추가 작성 명령은 이 adapter의 문법 표시 계약이 아닙니다.

```ts
import { createJSONDocument } from "@interactive-os/json-document";
import { createTextEditor } from "@interactive-os/json-document-editing";
import { createContentEditableBinding } from "@interactive-os/json-document-contenteditable";
import { createMarkdownDOMAdapter } from "@interactive-os/json-document-markdown-web";
import "@interactive-os/json-document-markdown-web/markdown-editor.css";

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
전달합니다. 문법의 source 범위를 재귀적으로 연결하며 각 문자와 개행을 한 번씩 보존합니다.
앞뒤의 같은 구조는 기존 DOM 요소와 Text node를 재사용합니다. 블록용 DOM도 span으로
구성하여 contenteditable의 원문 매핑에 암묵적인 개행을 추가하지 않습니다.

선택만 바뀌면 문법 파싱을 하지 않습니다. 투영 caret의 표시 속성 변경도 observer가
관측하므로 다음 render에서 원문이 같아도 DOM 정합성을 다시 확인할 수 있습니다. 전체 `innerHTML` 직렬화 대신
MutationObserver로 native DOM 변경을 추적합니다. native 서식·자식 요소가 변했으면
같은 원문이어도 다음 render에서 복원합니다. 원문 위치 매핑은 contenteditable의
DOM 변경 단위 캐시를 공유합니다. 문법이 불확실할 때의 전체 파싱과 초기 DOM 생성,
원문 diff·run 순회·브라우저 layout의 문서 크기 비용은 남습니다.

[기존 성능 검사](performance.md)의 수치는 strong 전용 구현의 기록입니다. 전체 문법 트리의 성능 수치로 재사용하지 않습니다.

[실행 가능한 Usage](/demo/markdown-caret)의 source 탭에서 canonical 구현까지 확인합니다.
