# Mention

Mention은 사람이 글 속에 이름으로 보이는 안정적인 entity reference를
삽입하는 Hands입니다. Slack이라는 App이나 message row가 아니라, `@`로
사람·agent·대상을 찾아 문맥에 넣는 손을 관찰합니다.

```text
보이는 이름       안정 reference
@Teo       →      { kind: "person", id: "person-42" }
```

사람의 손:

- `@`를 입력해 후보를 엽니다.
- typeahead와 화살표로 entity를 찾습니다.
- Enter로 reference를 삽입합니다.
- Backspace로 하나의 token처럼 지웁니다.
- 이름이 바뀌어도 reference의 대상은 유지됩니다.

Mention은 Rich Text extension schema의 inline atom입니다. label은 화면 표현이고
entity ID가 reference 정체성입니다. Selection과 Clipboard는 atom 전체를 한 단위로
다루므로 이름 일부만 지우거나 대상 ID를 잃은 평문으로 퇴화하지 않습니다.

`@interactive-os/json-document-rich-text-mention`이
`RICH_TEXT_MENTION_NODE`, `richTextMentionNodeSpec`, `insertRichTextMention`을
소유합니다. React surface는
`@interactive-os/json-document-rich-text-mention-react`의
`RichTextMentionAtom`으로 같은 node를 투영합니다. Composer는 이 계약을 조립하며
mention schema나 insertion, projection을 다시 구현하지 않습니다.

Host는 suggestion popup과 token을 그립니다. 검색 source, 권한, 알림 전송은
Mention이 소유하지 않습니다. Composer demo가 @ typeahead, atom 삽입, 삭제,
copy와 undo를 같은 Rich Text 경로로 증명합니다.
