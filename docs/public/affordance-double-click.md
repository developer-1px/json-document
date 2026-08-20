# Double-click

TBD.

Double-click은 `UIEvent.detail === 2`입니다. 글에서는 단어를 고르고,
목록·파일에서는 열거나 [Rename](affordance-rename.md)로 갈 수 있습니다.
장르 Intent가 뜻을 정하고, 횟수 손 자체는 닫혀 있어야 합니다.

```ts
import { /* TBD */ } from "@interactive-os/json-document-affordance";
```

닫는 손:
- click / dblclick, detail 2
- 글: 단어 범위
- 항목: 열기 또는 이름 바꾸기 (장르 Intent)

근거: [UIEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/UIEvent/detail)
