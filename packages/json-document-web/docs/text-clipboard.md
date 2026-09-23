## Literal text clipboard

`textClipboardCodec`는 `text/plain` payload의 원문을 그대로 encode/decode합니다.
Markdown delimiter, CRLF, trailing whitespace를 정규화하지 않습니다.
`createWebClipboardBinding`의 codec으로 주입하여 복사·잘라내기·붙여넣기의
기존 쓰기 실패/삭제 순서 계약을 재사용합니다.

[Markdown caret Usage](/demo/markdown-caret)의 contenteditable binding이 사용합니다.
