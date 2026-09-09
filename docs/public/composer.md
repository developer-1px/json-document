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
PNG·JPEG·WebP 첨부는 파일 정보에 실제 이미지 내용과 원본 크기를 함께 보존합니다.
이미지 내용이 없는 기존 attachment는 metadata-only이며, 두 상태를 같은 것으로
표시하지 않습니다.

## Public contract

`@interactive-os/json-document-composer`가 `COMPOSER_PROFILE_V1`,
`composerSchema`, `ComposerDraft`, `ComposerReference`, `ComposerAttachment`를
소유합니다. `findComposerTrigger(document, selection)`은 `/`·`@` query를 pure하게
찾고 `insertComposerReference`는 Host가 주입한 ID factory로 atom을 삽입합니다.
`createComposerDraft`, `insertComposerText`, `composerText`, `hasComposerContent`도
같은 owner의 public API입니다. Draft 변경은 raw JSON Pointer가 아니라
`addComposerAttachments`, `removeComposerAttachment`, `selectComposerModel` command를
사용합니다. `createComposerAttachments`는
`@interactive-os/json-document-file-intake`의 `validateFileCandidates`로 공통 파일
후보와 수용 정책을 검증한 뒤 Host가 주입한 ID로 Composer attachment를 만들며,
검증 실패를 명시적인 Composer command 결과로 번역합니다.
이미지가 있으면 같은 File Intake의 `RasterImageContent` 계약도 검증합니다.
호환용 `findComposerTrigger`와 `resolveComposerSuggestions`도 공용 Rich Text Suggestion
계약에 위임합니다.

`@interactive-os/json-document-composer-react`는 React Host를 위한
`useComposer({ id, config, ports, labels })`와 `ComposerReferenceAtom`을 제공합니다.
`useComposer`는 draft/editor 구독, mention·skill suggestion 통합, keyboard·history,
Web file·clipboard intake, focus 복구와 submit 실행 순서를 소유합니다. Host를 바꿀 때는
동일한 binding에 선언적인 config·ports·표현만 주입합니다. `ComposerReferenceAtom`은
skill projection을 소유하고 mention은
`@interactive-os/json-document-rich-text-mention-react`의
`RichTextMentionAtom`을 조립해 접근 가능한 DOM projection으로 렌더링합니다.
제품 className과 CSS는 Host가 주입합니다.

`composerHostConfigSchema`는 제품이 반드시 결정해야 하는 model·suggestion catalog,
attachment 제한과 Enter 정책만 JSON으로 검증합니다. `ComposerHostPorts`의 ID factory와
submit callback은 함수이므로 document나 JSON Schema에 넣지 않습니다.

Web `File`과 `ClipboardEvent`에서 이름·크기·media type을 읽는 일은
`@interactive-os/json-document-web`의 `fileCandidatesFromWebFiles`와
`fileCandidatesFromWebClipboard`가 담당합니다. 결과는
`@interactive-os/json-document-file-intake`의 `FileCandidate`입니다. Composer domain은
DOM과 Web object를 알지 않으며, Web adapter는 ID·허용 정책·attachment kind를 결정하지 않습니다.

파일 선택·drop·paste의 이미지 준비는 Web `readWebRasterFiles`를 함께 사용합니다.
Editing `createEditingPreparationQueue`가 완료 순서와 무관하게 입력 순서대로 반영하며,
한 요청의 실패는 일부 첨부나 Undo 기록을 남기지 않습니다. 준비 중에도 instruction을
계속 고칠 수 있고, 완료 시점의 최신 첨부 목록에 붙입니다. 이는 inline 문서의 paste
anchor를 추적하는 기능과는 다릅니다.

`useComposer`의 `isPreparingAttachments`, `attachmentError`, `canSubmit`,
`cancelAttachments()`로 준비·실패·취소 상태를 표현합니다. 준비 중에는 submit을 막고,
Escape·binding의 Undo/Redo·unmount는 늦은 결과의 삽입을 취소합니다. 외부에서 draft를
교체하거나 editor의 History API를 직접 호출할 때도 먼저 `cancelAttachments()`를 호출합니다.
첨부 완료는 현재 caret이나 focus를 옮기지 않습니다.

Host는 config 값과 runtime port를 주입하고 composer의 배치, copy, CSS와 첨부 preview를
그립니다. 파일 metadata 표시는 File Intake 정본의 `formatFileSize`를 사용합니다.
후보 자료·제품 copy·권한은 Host가 정하지만 suggestion open/dismiss, keyboard focus,
pointer active state와 mention 삽입 lifecycle은 정본 Hands가 소유합니다.
검색 source, 파일 저장소, Agent runtime, transcript, think·stream·tool 상태는
Composer가 소유하지 않습니다.

## 이미지와 Clipboard의 남은 기본기

이미지-only HTML은 Web의 inert parser와 준비 API를 통해 포함된 PNG/JPEG/WebP를
실제 첨부로 읽습니다. 내부 Rich Text 구조화 복사는 기존 binding에 우선 위임하며,
파일이 함께 있으면 파일 표현만 처리합니다. 글+이미지 HTML은 일부 내용을 버리는 대신
전체를 미지원 오류로 알립니다. 외부·상대·blob·cid 이미지 주소는 다운로드하지 않습니다.

[Paste × Image TBD](clipboard.md#paste--image-기본기--tbd)에 HTML의 남은 source·혼합 입력,
명시적인 plain paste, 이미지로 복사와 OS-native round-trip의 소유자·기대 결과를
미리 공개합니다. 현재 Composer 이미지 slice는 별도 첨부 목록에 내용을 보존하는
단계이며 inline 혼합 입력을 구현한 것은 아닙니다. 서버 업로드와 자산 저장소는
별도 계약이고, 이미지 외 파일은 현재 파일 정보만 보존합니다.

```live-demo
/demo/composer
```
