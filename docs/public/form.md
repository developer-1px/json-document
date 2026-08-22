# Form

TBD.

Form은 질문 카드를 넣고 정렬하는 손입니다. 타입과 필수는 카드 위에서
고르고, 핸들로 순서를 바꿉니다. 미리보기는 편집과 갈립니다.

```ts
function onAddQuestion() {
  editor.dispatch({ type: "question.insert" });
}

function onQuestionMove(questionId: string, afterId: string | null) {
  editor.dispatch({ type: "question.move", questionId, afterId });
}

function onRequiredToggle(questionId: string, required: boolean) {
  editor.dispatch({ type: "question.fill", questionId, required });
}
```

호스트는 카드와 미리보기를 그립니다. 응답 수집은 Form Intent가 아닙니다.

닫는 손:
- 추가: 질문 카드
- 핸들 드래그: 순서
- 타입, Required: 카드 값
- Preview: 응답 화면

근거: [Google Forms](https://support.google.com/docs/answer/2839737?hl=en)
