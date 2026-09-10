## 선택과 history를 가진 문자열 binding

`createContentEditableBinding`의 선택적 `editor`는 Editing의 `TextEditor`입니다.
`document`/`pointer`가 binding과 다르면 초기화 시 거절합니다.
editor를 넘기면 직접 document commit 대신 `editor.replace`를 사용하여 원문과 selection을
동일한 history 항목에 기록합니다. 생략하면 기존 직접 commit 연결이 유지됩니다.

editor를 사용하는 원문 모드에서는 native `format*` 입력을 거절합니다.
원문 밖의 Rich Text formatting state를 만들지 않습니다. HTML-only paste도 거절하며
`text/plain` representation이 있어야 원문으로 붙여넣습니다.

DOM 선택 변경은 editor selection으로 연결합니다. Undo/Redo는 Web keyboard adapter와
native history beforeinput을 통해 처리하며, clipboard는 Web binding의 literal
`textClipboardCodec`를 사용합니다. clipboard 쓰기가 실패한 cut은 문서를 삭제하지 않습니다.

`TextDOMAdapter.render`의 선택적 세 번째 인자는 source selection 또는 `null`입니다.
Markdown처럼 caret에 따른 표시를 지원하는 projection이 소비합니다.
native/composing lease 중에는 projection을 다시 그리지 않습니다.
동일 target이 lease 중 변경되면 `text_source_stale`로 거절하고 최신 원문을 복원합니다.
blur/cancel/dispose는 미완료 lease를 폐기합니다.

editor 모드에서 조합 중 Enter는 IME 확정을 허용한 뒤 `compositionend`에서
`editor.insert("\n")`를 이어갑니다. 같은 Enter가 만드는 native paragraph/line-break
입력은 중복 반영하지 않습니다. 다음 Enter의 `insertParagraph`/`insertLineBreak`도
`editor.insert("\n")`로 번역해 원문 위치에 줄바꿈 한 개를 삽입합니다.
Undo는 줄바꿈을 먼저, 그다음 확정한 조합을 되돌립니다. Enter 없이 끝난 조합이나
blur/cancel로 폐기한 조합에는 줄바꿈을 추가하지 않습니다.

## 마지막 빈 줄의 caret

`renderTextCaretBoundary(root, source)`는 빈 원문 또는 `\n`으로 끝나는 원문에
caret용 `<br data-contenteditable-caret>`를 둡니다. DOM projection을 그린 뒤 호출하며
중복 호출해도 하나만 유지합니다. `plainTextDOMAdapter.render`가 기본으로 사용하고,
Markdown처럼 별도 projection을 만드는 adapter도 같은 공개 함수를 사용합니다.
`plainTextDOMAdapter.observe`는 이 요소를 원문·선택 offset에 포함하지 않습니다.
일반 native `<br>`는 원문의 줄바꿈으로 유지합니다. 마지막 빈 줄 뒤에서 다음 입력이
이전 줄로 돌아가는 브라우저 동작을 막으며 원문에 보조 문자를 넣지 않습니다.

[Markdown caret Usage](/demo/markdown-caret) · [Markdown DOM API](/docs/api/markdown-web)
