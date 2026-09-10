# @interactive-os/json-document-composer

Headless Composer profile, draft commands, Host policy schema, interaction meaning,
skill references and triggers for JSON Document Rich Text. Entity mention schema and
insertion come from `@interactive-os/json-document-rich-text-mention`; platform-independent
file validation comes from `@interactive-os/json-document-file-intake`. Composer promotes
those validated candidates into Composer context attachments.

`resolveComposerSuggestions(trigger, suggestions)` owns trigger-aware matching of a
product-configured suggestion catalog. React menu lifecycle and atom projection live in
`@interactive-os/json-document-composer-react`.

## 이미지 첨부

`ComposerAttachment`와 `ComposerAttachmentCandidate`의 선택적 `image`는 File Intake의
`RasterImageContent`입니다. 기존 metadata-only 첨부는 그대로 유효합니다.
`createComposerAttachments`는 image source·치수와 media type을 검사한 뒤 ID를 할당하고,
`addComposerAttachments`는 한 batch를 기존 Rich Text editor의 한 편집/Undo로 추가합니다.
이미지 내용은 같은 draft JSON에 남으므로 별도의 임시 blob URL에 의존하지 않습니다.

```ts
const prepared = createComposerAttachments([
  { name: "screenshot.png", size: fileSize, mediaType: "image/png", image: decodedImage },
], { policy, createId, currentCount: draft.attachments.length });
if (prepared.ok) addComposerAttachments(editor, draft, prepared.attachments);
```

`image`가 없는 첨부는 파일 이름·크기·형식 정보뿐입니다. 실제 byte 저장이나 서버 업로드가
완료된 파일이라고 해석하지 않습니다. Clipboard HTML의 글+이미지 변환과 이미지 asset
저장소 연결은 TBD입니다. 실제 Usage·Source는 [Composer](/demo/composer)에 있습니다.

`composerInteractionFromKeyStroke(stroke, policy)` preserves the existing
`commandKey` input (Meta or Control) and accepts optional `altKey` alongside
`shiftKey`. Omitted modifiers are false. Its keyboard compatibility boundary
uses `@interactive-os/json-document-web`'s pure default resolver for Undo/Redo:
Mod+Z undoes, Mod+Shift+Z redoes, and Alt-modified variants return `null`.
Composer still owns Escape and the configured Enter submit/newline meaning.
The keyboard dependency is confined to `interaction.ts`; draft model, schema,
and commands do not interpret Web events. No DOM environment is required.

Usage: [Composer](https://developer-1px.github.io/json-document/demo/composer).
The React integration passes all modifier facts to this boundary.
