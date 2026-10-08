## Chat Composer

`ChatComposer`는 `useComposer` binding을 사용하는 간결한 텍스트 입력·전송 surface입니다.
표시·편집은 `RichTextEditorSurface`, 전송 버튼은 공통 `Command`를 사용합니다.

```tsx
import { ChatComposer, useComposer } from "@interactive-os/json-document-composer-react";
import "@interactive-os/json-document-composer-react/chat-composer.css";

const composer = useComposer({
  id: "chat", config, ports,
  labels: { mentionSuggestions: "멘션", skillSuggestions: "스킬" },
  shouldClearAfterSubmit: true,
});
<ChatComposer composer={composer} label="메시지" placeholder="메시지 입력"
  submitLabel="보내기" submitErrorLabel="보내지 못했습니다. 다시 시도해 주세요." />;
```

| 속성 | 계약 |
| --- | --- |
| `composer` | 기존 `useComposer` binding. 텍스트 surface에는 빈 `config.suggestions`를 사용 |
| `label` | 필수 입력창 접근 가능한 이름 |
| `submitLabel` | 필수 전송 버튼 이름 |
| `submitErrorLabel` | 필수 전송 실패 문구. `submitError`가 있을 때 alert로 표시 |
| `placeholder` | 선택적 안내 문구. draft에 저장되지 않음 |
| `className` | Host의 배치·크기 확장 |

이 surface는 첨부·멘션 메뉴·모델 선택 UI를 제공하지 않으며 파일 paste를 가로채지 않습니다.
해당 기능이 필요한 Host는 기존 `useComposer`와 각 정본 surface를 조합합니다.
CSS는 기존 semantic token을 사용하며 토큰이 없으면 기본 색상을 사용합니다.
Rich Text의 `placeholder.css`를 함께 불러오므로 안내 문구가 커서 위치를 밀지 않습니다.

### 제출 lifecycle

- `submit()`과 설정된 키보드 제출은 같은 port를 사용합니다. 조합 중 Enter 및 keyCode 229는 소비하지 않습니다.
- `isSubmitting` 동안 중복 제출을 차단하며 `canSubmit`은 false입니다. 작성은 계속할 수 있습니다.
- port가 reject/throw하면 `submitError: Error | null`에 남고 draft를 보존합니다. 다음 제출 시 오류를 지웁니다.
- `shouldClearAfterSubmit`은 기본 false입니다. true이면 port가 성공하고 draft가 그대로일 때만 빈 draft로 바꿉니다.
- 기다리는 동안 draft 변경이나 첨부 준비가 있었다면 보존합니다. 비우기는 기존 editor의 한 번의 Undo로 복원 가능합니다.
- port 성공은 Host가 수락했다는 의미입니다. 이 패키지는 네트워크 전달·AI 응답을 보장하지 않습니다.

[Chat Usage](/demo/chat)는 로컬 draft를 화면에 표시하는 Host port를 사용합니다.
Source 탭은 ChatComposer와 useComposer의 canonical 구현까지 연결합니다.

For chat, combine `shouldClearAfterSubmit: true` with
`submitClearTiming: "start"`. The submitted draft is captured and cleared before
the asynchronous port runs; new input is preserved while the request is pending.
The Host must retain the submitted message and show failures separately. The
existing default `"success"` still preserves a failed draft for form-like Hosts.
