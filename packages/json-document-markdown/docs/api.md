## Markdown 원문 projection 실험

생태계 위치는 **Document Types**입니다. Markdown 원문 문자열이 정본이며
JSONDocument의 root string 또는 string pointer로 보관합니다.
Rich Text의 구조화된 문서 모델과 독립적입니다. 파싱한 AST는 저장하거나 다시 직렬화하지 않습니다.

`projectMarkdown(source)`는 동일한 `source`와 `strong` 목록을 반환합니다.
CommonMark parser가 인식한 `**…**`, `__…__`의 원문 위치만 추출합니다.
`from`/`to`는 delimiter를 포함하고 `contentFrom`/`contentTo`는 내부 텍스트의
UTF-16 half-open 범위입니다. DOM Selection과 같은 좌표계를 사용합니다.
code·escape·미완성 문법은 CommonMark 규칙에 따릅니다.

현재 실험은 한 문단의 strong 문법과 caret 이동에 집중합니다. 나머지 문법은
원문으로 보존합니다. CRLF, 공백, delimiter의 선택을 정규화하지 않습니다.
전체 문서를 다시 파싱하므로 대용량 성능·증분 파싱은 검증 범위에 없습니다.

```ts
import { projectMarkdown } from "@interactive-os/json-document-markdown";
const source = "A **한글** and __raw__";
const projection = projectMarkdown(source);
const first = projection.strong[0]!;
source.slice(first.contentFrom, first.contentTo); // "한글"
```

책임의 연결:

```text
JSONDocument string
  + Editing.createTextEditor        source edits + selection + history
  + Markdown.projectMarkdown        source syntax ranges
  + Markdown Web DOM adapter        source <-> DOM + delimiter visibility
  + contenteditable binding         native input lease + clipboard + history keys
  + Markdown React surface          React lifecycle composition
```

[편집 Usage](/demo/markdown-caret)에서 원문 JSON과 caret을 함께 확인할 수 있습니다.
[DOM 계약](/docs/api/markdown-web), [React 연결](/docs/api/markdown-react)을 함께 봅니다.

```live-demo
/demo/markdown-caret
```
