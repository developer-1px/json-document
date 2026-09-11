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
입력은 중복 반영하지 않습니다. 한글 IME가 `keydown(229) → keyup(13) → keydown(13)`을
동일한 `timeStamp`로 재전달하는 경우, 중간 keyup 뒤에도 이미 처리한 Enter 상태를 유지합니다.
실제 release 또는 다른 timestamp의 다음 keydown에서 상태를 해제합니다. 시간 간격에 따른
일괄 무시는 하지 않으며 키 반복도 허용합니다. 다음 Enter의 `insertParagraph`/`insertLineBreak`도
`editor.insert("\n")`로 번역해 원문 위치에 줄바꿈 한 개를 삽입합니다.
브라우저가 조합 종료 전에 native paragraph/line-break `input`을 이미 처리했다면
그 DOM 결과를 반영하고 줄바꿈을 추가하지 않습니다. 편집기가 추가한 줄바꿈은
Undo로 먼저 되돌리고, 그다음 확정한 조합을 되돌립니다. native 줄바꿈은 조합과 함께 되돌립니다. Enter 없이 끝난 조합이나
blur/cancel로 폐기한 조합에는 줄바꿈을 추가하지 않습니다.

## 마지막 빈 줄의 caret

`renderTextCaretBoundary(root, source)`는 빈 원문 또는 `\n`으로 끝나는 원문에
caret용 `<br data-contenteditable-caret>`를 둡니다. DOM projection을 그린 뒤 호출하며
중복 호출해도 하나만 유지합니다. `plainTextDOMAdapter.render`가 기본으로 사용하고,
Markdown처럼 별도 projection을 만드는 adapter도 같은 공개 함수를 사용합니다.
`plainTextDOMAdapter.observe`는 이 요소를 원문·선택 offset에 포함하지 않습니다.
일반 native `<br>`는 원문의 줄바꿈으로 유지합니다. 마지막 빈 줄 뒤에서 다음 입력이
이전 줄로 돌아가는 브라우저 동작을 막으며 원문에 보조 문자를 넣지 않습니다.

## DOM 위치 캐시

`plainTextDOMAdapter`는 DOM 내용이 바뀔 때 원문과 위치 인덱스를 함께 만듭니다.
선택만 움직이는 관측은 DOM 전체를 다시 읽지 않으며, 원문 위치의 Text node는
이진 탐색으로 찾습니다. 현재 native selection과 같으면 선택을 다시 설정하지 않습니다.
자식 교체·텍스트 변경·caret 보조 표시 속성 변경은 즉시 캐시를 무효화합니다.
native 줄바꿈과 방향 있는 선택도 같은 원문 좌표를 사용합니다.

[Markdown caret Usage](/demo/markdown-caret) · [Markdown DOM API](/docs/api/markdown-web)

`Mod+A`는 `selectAllAffordance`의 반복 유지 정책을 사용하여 원문 전체를 선택합니다.
Markdown처럼 첫/마지막 문법 기호가 숨겨진 projection에서도 `[0, source.length]`가
선택되며, 다시 눌러도 선택을 해제하지 않습니다. IME 조합 중에는 브라우저/입력기에 맡깁니다.

## 투영된 구간의 좌우 이동

`TextDOMAdapter.resolveHorizontalSelection(root, selection, direction, extend)`는 선택적인
원문 좌표 이동 계약입니다. `direction`은 `backward`/`forward`, `extend`는 Shift 선택입니다.
반환된 선택은 binding이 `editor.select`와 DOM 복원으로 반영하며, `null`이면 native 이동을
유지합니다. modifier 없는 좌우 방향키와 Shift+좌우에만 적용하고 IME 조합·native lease 중에는
호출하지 않습니다. Markdown Usage의 제목 표시가 이 계약으로 원문 접두사와 본문 경계를
연결합니다. 입력·삭제·history를 별도 구현하지 않습니다.
