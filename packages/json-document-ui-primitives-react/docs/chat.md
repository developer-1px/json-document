# Chat

`ChatBubble`은 현재 읽는 사람을 기준으로 수신·발신 메시지를 표현하는 React primitive입니다.
입력창은 `@interactive-os/json-document-composer-react`의 `ChatComposer`를 조합합니다.
대화 목록, 프로필, 화면 고정, 접기·펼치기, 네트워크와 AI 실행은 포함하지 않습니다.

## API

```tsx
import { ChatBubble } from "@interactive-os/json-document-ui-primitives-react";
import "@interactive-os/json-document-ui-primitives-react/chat-bubble.css";

<ChatBubble direction="incoming" label="상대방">안녕하세요.</ChatBubble>
<ChatBubble direction="outgoing" label="나">반갑습니다.</ChatBubble>
```

| 속성 | 계약 |
| --- | --- |
| `direction` | `incoming`은 inline 시작, `outgoing`은 inline 끝 정렬. AI·사람 구분을 강제하지 않음 |
| `label` | 필수 접근 가능한 발신자 이름. 별도의 시각적 역할 라벨을 추가하지 않음 |
| `children` | 메시지 내용. plain text 또는 기존 Rich Text/Markdown renderer를 조합 |
| 나머지 `HTMLAttributes<HTMLDivElement>` | Host의 className, style, 언어·방향 등. group 의미와 label은 primitive가 소유 |

스타일은 별도로 한 번 import합니다. `data-ui-chat-bubble` 값으로 방향을 구분하며,
기존 `--color-background-subtle`, `--color-background-action-primary`,
`--color-foreground-default`, `--color-foreground-inverse`, `--radius-surface`,
`--radius-tight` 토큰을 사용합니다. 토큰이 없는 소비자는 기본 색상과 기본 반경을 사용합니다.
긴 단어와 여러 줄을 보존하며 RTL에서는 논리 방향으로 정렬합니다.

## 조합

여러 버블을 시간순으로 놓을 때 Host는 `role="log"`와 접근 가능한 대화 이름을 제공합니다.
스크롤, 데이터 보관, 수신 메시지, 네트워크 전송은 제품 정책입니다. 버블은 이를 소유하지 않습니다.
입력·제출·실패·draft 비우기의 정본은 Composer이며 Usage에 동일 동작을 다시 구현하지 않습니다.

[Chat Usage](/demo/chat)에서 입력·전송·연속 메시지를 확인하고 Source에서 정본 구현을 볼 수 있습니다.
입력창 API는 [Composer React API](/docs/api/composer-react#chat-composer)에 있습니다.

## Usage

```live-demo
/demo/chat
```
