# @interactive-os/json-document-composer-react

Official React interaction and reference projection integration for JSON Document Composer.

```tsx
const composer = useComposer({ id: "agent-composer", config, ports, labels });

<RichTextEditorSurface
  editor={composer.editor}
  elementRef={composer.editorElementRef}
  onKeyDownCapture={composer.handleKeyDown}
  renderExtension={composer.renderReference}
/>;
```

Mention projection delegates to
`@interactive-os/json-document-rich-text-mention-react`; suggestion interaction is
composed from the canonical suggestion packages.

Product copy, styling, layout, suggestions, and concrete ports remain Host-owned.
Draft/editor subscription, suggestion integration, keyboard/history execution, Web file
intake, focus recovery, and submit lifecycle remain canonical across Host replacements.

## 이미지 준비와 편집

`useComposer`의 `addWebFiles`, `handlePaste`, `handleFileInputChange`는 같은 파일 입력 경로를
사용합니다. Web `readWebRasterFiles`가 PNG/JPEG/WebP를 실제로 decode하고,
Editing `createEditingPreparationQueue`가 준비 완료와 무관하게 요청 순서를 유지합니다.
일반 파일은 기존 metadata-only 첨부로 남으며 `image`가 있는 첨부만 실제 내용을 보존합니다.

| API | 계약 |
| --- | --- |
| `isPreparingAttachments` | 아직 완료하지 않은 첨부 준비가 있음 |
| `attachmentError` | 가장 최근 실패의 `code`와 선택적 `reason`, 성공/새 입력/취소 시 초기화 |
| `cancelAttachments()` | 대기 batch를 취소하고 실제 파일 읽기를 중단; 늦은 결과는 반영하지 않음 |
| `canSubmit` | 내용이 있고 대기 중인 첨부가 없음 |
| `submit()` | 최신 draft를 사용하며, 준비 중에는 호출해도 submit port를 실행하지 않음 |
| `maxImagePixels?` | 이미지당 decode 후 픽셀 제한, 기본 16,000,000 |
| `readRaster?` | Web reader의 대체 instance 주입. 테스트·환경 연결용이며 문서 모델을 바꾸지 않음 |

파일 수·byte 제한과 허용 media type은 기존 `config.attachments`가 결정합니다.
정책은 읽기 전에 검사하고, 실제 추가 직전 최신 첨부 수와 정책으로 다시 검사합니다.
실패한 batch는 첨부와 History를 일부만 남기지 않습니다. 추가는 최신 첨부 목록의 끝에서
이루어지므로 준비 중 typing/caret 이동은 유지하며 현재 text selection을 덮어쓰지 않습니다.
늦은 완료가 focus를 빼앗지 않습니다. 파일 선택 창을 닫을 때만 editor focus를 복구합니다.

Escape, `cancelAttachments`, `handleHistoryKeyDown`의 Undo/Redo, unmount는 준비를 취소합니다.
직접 `editor.undo/redo` 또는 외부 문서 교체를 수행하는 소비자는 먼저 `cancelAttachments()`를
호출합니다. queue 자체는 문서 History나 text 삽입 위치 mapping을 대신하지 않습니다.
React Host는 `handlePaste`와 `handleHistoryKeyDown`을 감싸는 surface의 capture handler에,
`handleKeyDown`은 editor에 연결하고 상태/실패를 표시합니다.

파일이 있는 paste는 Web에서 동기 캡처하고 한 번만 처리합니다. 파일이 없는 텍스트/HTML은
기존 Rich Text 경로에 위임합니다. HTML 이미지·글+이미지 변환은 아직 TBD이며,
파일과 HTML 양쪽의 내용을 모두 별개로 추가하지 않습니다.

Usage와 Source: [Composer](/demo/composer). PNG/JPEG/WebP의 내용·미리보기·삭제·Undo/Redo와
submit payload를 확인할 수 있습니다. 서버 upload와 OS-native Clipboard 호환성 완료를
주장하지 않습니다.
