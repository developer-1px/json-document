## Markdown Web DOM 계약

생태계 위치는 **Adapter**입니다. `createMarkdownDOMAdapter()`는 contenteditable의
`TextDOMAdapter`를 구현합니다. 원문 텍스트와 DOM Selection의 UTF-16 offset이
같은 좌표계를 사용하며, 방향 있는 selection도 유지합니다.

`render(root, source, selection?)`는 CommonMark/GFM 트리를 원문 보존 DOM으로 표시합니다.
제목 단계, 중첩 강조, 링크·이미지, 코드, 목록·인용, 표·정렬, task 상태를 반영합니다.
제목은 편집 중에도 제목 스타일을 유지합니다. ATX의 여는 `#`는 왼쪽 H1~H6
표시로 투영하고 첫 구분 공백은 마커와 본문 사이에 배치합니다. 추가 공백은 본문에
남아 기본 제목과 일반 본문 시작선이 일치합니다. 닫는 #와 Setext 밑줄도 원문 범위에
대응하는 편집 가능한 기호입니다.

모든 기호는 `MarkdownProjection.markers`에서 가져옵니다. 문법을 DOM에서 다시
추측하지 않고 contenteditable의 공용 `createTextProjectionDOMAdapter`에 전달합니다.
방향키는 투영 앞뒤와 다음 원문 위치로 이동하며 커서는 실제 표시 양 끝에 맞습니다.
일반 기호의 Backspace/Delete는 원문 grapheme 한 개를 삭제합니다. todo는 `atomic`
투영으로 목록 접두사·체크 문법·첫 구분 공백을 한 번에 삭제하며, 부분 선택도 전체로 확장합니다.
두 정책 모두 한 번의 Editing History transaction으로 반영하여 Undo 한 번에 복원합니다. Shift 선택·복사·Undo는
원문을 보존합니다. 임의 원문 offset 복원도 가능합니다.

| 기호 | 표시·편집 정책 |
| --- | --- |
| 비순서·순서 목록 | 원문 -, +, *는 •로, 번호와 구분자는 번호 표시로 투영 |
| task list | 목록 접두사와 [ ]/[x]를 하나의 체크박스 표시로 투영. 클릭·Space로 토글, Delete·Backspace로 원자 삭제 |
| 인용 | 각 줄의 >를 세로 기호로 표시. 중첩 단계와 원문 공백 유지 |
| fenced code | 여는/닫는 펜스를 흐린 기호로 표시. 언어·코드·줄바꿈은 원문 유지 |
| 강조·취소선·inline code·링크·이미지 | 기존 선택 영역의 문법 노출을 유지하며 각 구간의 경계 이동과 삭제를 공용 투영으로 연결 |
| 표 | 선택 중 원문 기호, 선택 밖에서는 셀 표현. 기호도 동일한 투영 계약을 소비 |
| 구분선·Setext·각주·참조 정의·escape·hard break | 파서가 인식한 기호 범위에 커서와 편집을 연결 |

투영 표시의 CSS 대체 텍스트는 DOM text와 복사 원문에 추가되지 않습니다. 의미는
heading/list/table/link 등 기존 접근성 역할이 전달합니다. HTML은 실행하지 않는
원문이며, entity는 해석된 글자로 표시하되 원문 구간의 경계 이동·삭제를 유지합니다. 이미지 미리보기는
원문을 추가하지 않습니다. `createMarkdownDOMAdapter({ editor })`의 `MarkdownDOMOptions.editor`에
같은 TextEditor를 주입하면 native checkbox의 클릭·Space가 원문의 `[ ]`/`[x]`와 기존 History에
반영됩니다. editor가 없거나 root가 읽기 전용이면 체크박스는 비활성 상태로 표시합니다.
체크박스는 공용 Check primitive와 같은 `input[type=checkbox][data-ui-control=check]` 계약을 사용합니다.

공용 `restoreSelection`의 affinity가 경계 위치를 복원하므로 Markdown은 DOM Selection을
직접 다시 설정하지 않습니다. 키 해석은 Web keyboard adapter, IME lease는 contenteditable
binding, 입력·삭제·실행 취소는 Editing이 소유합니다. Bear와 Demo에는 기호별 편집 로직이 없습니다.

기본 표현은 public CSS를 한 번 import합니다. `--markdown-muted`, `--markdown-accent`,
`--markdown-code-background`, `--markdown-border`, `--markdown-marker-size`, `--markdown-heading-gap`, `--text-projection-caret` 변수로 제품 semantic token을 주입합니다.
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
  dom: createMarkdownDOMAdapter({ editor }),
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

## 원문 보존형 편집

Markdown 문자열이 정본이고 CommonMark + GFM은 문법 의미를 결정합니다.
편집 화면은 출력용 HTML과 다른 표시 계약을 가집니다. 파서가 제목 내용에서
제외한 공백도 원문에 존재하면 화면에 남습니다. `##    제목`은 H2 표시와
마커 쪽 첫 구분 공백, 본문 쪽 추가 세 칸의 공백, 제목으로 표시합니다. 앞쪽 들여쓰기와 뒤쪽 공백·탭도 보존합니다.
기호를 숨기거나 바꾸는 것은 원문을 삭제하거나 정규화하는 작업이 아닙니다.

일반 텍스트의 연속 공백·탭·빈 줄은 `pre-wrap`으로 보존합니다. 제목 공백은
일반 원문 구간이므로 입력·선택·복사·삭제·Undo도 원문 좌표를 따릅니다.
문법이 미완성이면 현재 CommonMark/GFM 해석에 따라 원문을 표시하고,
입력 후 점진적 파싱으로 표현을 갱신합니다. 별도 편집용 dialect는 정의하지 않습니다.
기존 표·코드·escape·entity의 문법별 표현은 위 계약을 따르며, 출력용 직렬화나
새로운 문법 인식 규칙을 이 adapter에 추가하지 않습니다.
