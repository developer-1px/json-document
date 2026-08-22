# Mention

TBD.

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

Host는 suggestion popup과 token을 그립니다. 검색 source, 권한, 알림 전송은
Mention이 소유하지 않습니다. Composer 안에서 먼저 증명하지만 문서 comment나
다른 rich text에서도 같은 이름이 자연스러운지는 TBD입니다.
