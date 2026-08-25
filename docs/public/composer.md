# Composer

Composer는 사람이 agent에게 지시와 맥락을 한 턴으로 건네는 Hands입니다.
단순한 text input이 아닙니다. 자연어와 함께 사람·agent, artifact, 현재 선택,
첨부 자료를 하나의 요청으로 구성합니다.

```text
instruction
+ mention
+ artifact reference
+ current selection
= one agent turn
```

사람의 손:

- 자연어 지시를 쓰고 고칩니다.
- [Mention](mention.md)으로 사람이나 agent를 가리킵니다.
- 현재 artifact 또는 선택 범위를 context로 붙입니다.
- Enter로 턴을 확정하고, Shift+Enter로 줄을 바꿉니다.
- 실행 전에는 붙인 context를 보고 뺄 수 있습니다.

Composer의 instruction은 Rich Text extension profile을 사용하는 canonical JSON이고,
사람·agent와 skill은 안정 ID를 가진 inline atom입니다. 첨부 자료도 보이는 파일명과
별개인 ID를 가진 context로 같은 draft에 남습니다. native contenteditable은 입력,
Selection, IME, structured Clipboard와 history를 기존 Rich Text editor에 위임합니다.

## Public contract

`@interactive-os/json-document-composer`가 `COMPOSER_PROFILE_V1`,
`composerSchema`, `ComposerDraft`, `ComposerReference`, `ComposerAttachment`를
소유합니다. `findComposerTrigger(document, selection)`은 `/`·`@` query를 pure하게
찾고 `insertComposerReference`는 Host가 주입한 ID factory로 atom을 삽입합니다.
`createComposerDraft`, `insertComposerText`, `composerText`, `hasComposerContent`도
같은 owner의 public API입니다. Draft 변경은 raw JSON Pointer가 아니라
`addComposerAttachments`, `removeComposerAttachment`, `selectComposerModel` command를
사용합니다. `createComposerAttachments`는 Host가 주입한 ID와 attachment policy를
적용하며 실패를 명시적인 결과로 반환합니다.

`composerHostConfigSchema`는 제품이 반드시 결정해야 하는 model·suggestion catalog,
attachment 제한과 Enter 정책만 JSON으로 검증합니다. `ComposerHostPorts`의 ID factory와
submit callback은 함수이므로 document나 JSON Schema에 넣지 않습니다.

Web `File`과 `ClipboardEvent`에서 이름·크기·media type을 읽는 일은
`@interactive-os/json-document-web`의 `composerAttachmentCandidatesFromWebFiles`와
`composerAttachmentCandidatesFromWebClipboard`가 담당합니다. Composer domain은 DOM과
Web object를 알지 않으며, Web adapter는 ID·허용 정책·attachment kind를 결정하지 않습니다.

Host는 config 값과 runtime port를 주입하고 composer의 배치, copy, CSS와 첨부 preview를
그립니다. 검색 source, 파일 저장소, Agent runtime, transcript, think·stream·tool 상태는
Composer가 소유하지 않습니다.

```live-demo
/demo/composer
```
