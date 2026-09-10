## Markdown 원문 projection

생태계 위치는 **Document Types**입니다. Markdown 원문 문자열이 정본이며
JSONDocument의 root string 또는 string pointer로 보관합니다.
Rich Text의 구조화된 문서 모델과 독립적입니다. 문법 상태는 원문에서 파생하는 캐시이며
JSONDocument에 저장하거나 원문으로 다시 직렬화하지 않습니다.

`projectMarkdown(source)`는 동일한 `source`, 전체 문법 트리 `nodes`, 기존 API와 호환되는
`strong` 범위 목록을 반환합니다. CommonMark에 GFM 확장(표·task list·취소선·자동 링크·각주)을
적용합니다. `nodes`는 공개 `MarkdownNode`의 불변 배열이며 `kind`, `from`, `to`,
`children`과 해당 문법의 `depth`, `url`, `checked`, `align`, `value` 등을 제공합니다.
위치는 모두 원문의 UTF-16 half-open 좌표이며 `value`는 해석된 표시 값일 뿐 정본을 대체하지 않습니다.
기존 `strong`의 `contentFrom`/`contentTo`는 내부 텍스트 범위를 나타냅니다.

| 구분 | 문법 |
| --- | --- |
| 블록 | ATX/Setext 제목, 문단·빈 줄, 구분선, 인용, 순서/비순서·중첩 목록, fenced/indented 코드, HTML, 참조 정의 |
| 인라인 | 강조·굵게·중첩 강조, 코드, 링크·이미지·참조 링크/이미지, 자동 링크, escape·entity, hard/soft break, HTML |
| GFM | 표와 정렬, task list, 취소선, literal autolink, 각주 |

CRLF·공백·기호·미완성 문법을 정규화하지 않습니다. 구조 편집은 기존 TextEditor의 원문
변경을 통해 수행합니다. Bear 전용 태그·위키 링크·하이라이트·수식은 이 계약에 포함하지 않습니다.

```ts
import { projectMarkdown } from "@interactive-os/json-document-markdown";
const source = "# 제목\n\nA **한글** and __raw__";
const projection = projectMarkdown(source);
projection.nodes[0]!.kind; // "heading"
projection.nodes[0]!.depth; // 1
const first = projection.strong[0]!;
source.slice(first.contentFrom, first.contentTo); // "한글"
```

## 이전 문법 상태와 변경 범위

`createMarkdownParser(source)`는 `projection`과 `update(from, to, insert)`를 제공합니다.
`from`/`to`는 **현재 원문**의 UTF-16 half-open 범위이며 매 update는 순서대로 적용됩니다.
범위가 잘못되면 `RangeError`, 삽입값이 문자열이 아니면 `TypeError`를 던지고 상태를 유지합니다.
같은 문자열로 교체하면 기존 projection과 `changed: null`을 반환합니다.
이전 projection도 불변 snapshot으로 계속 읽을 수 있습니다.

```ts
import { createMarkdownParser } from "@interactive-os/json-document-markdown";
const parser = createMarkdownParser("A **한글**\n\nNext paragraph");
const update = parser.update(5, 5, "추가");
update.projection.source; // "A **한추가글**\n\nNext paragraph"
update.changed; // { from: 0, to: 8, newTo: 10 }
```

`changed`는 재구성할 **완전한 블록 범위**입니다. 이전 `[from, to)`를 새 `[from, newTo)`로
바꾸고, 이후 구간의 offset을 `newTo - to`만큼 옮깁니다. 전체 재파싱 시 문서 전체를 반환합니다.
이 범위는 최소 문자 diff가 아니며 화면 owner가 영향 없는 결과를 재사용하기 위한 계약입니다.

문법 owner는 블록 상대 위치의 전체 문법 트리와 strong·text 조각을 보관합니다. 구분자 인식과 블록 문맥을
보존하는 글자 편집은 위치만 갱신합니다. 마지막 문단의 일반 글자·한 줄 개행 추가도 문맥이
확실하면 재사용합니다. 문단 안의 inline 변경은 해당 문단을 파싱하며, 참조 정의가 있거나
블록 경계·문법 영향이 불확실하면 기존 CommonMark 전체 파싱으로 되돌아갑니다.
따라서 긴 단일 문단의 구조 편집까지 일정한 시간 안에 처리한다는 보장은 없습니다.

JSONDocument의 변경은 Editing이 소유합니다. 이 API는 저장·선택·Undo를 소유하지 않으며
Web adapter가 `diffText`로 원문 변경 범위를 구해 연결합니다.

책임의 연결:

```text
JSONDocument string
  + Editing.createTextEditor        source edits + selection + history
  + Markdown.createMarkdownParser   persistent source syntax ranges
  + Markdown Web DOM adapter        source <-> DOM + delimiter visibility
  + contenteditable binding         native input lease + clipboard + history keys
  + Markdown React surface          React lifecycle composition
```

[편집 Usage](/demo/markdown-caret)에서 원문 JSON과 caret을 함께 확인할 수 있습니다.
[DOM 계약](/docs/api/markdown-web), [React 연결](/docs/api/markdown-react)을 함께 봅니다.

```live-demo
/demo/markdown-caret
```
