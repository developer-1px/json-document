# 코어 컨셉

사이트 탐색이 이 나무입니다. 먼저 문서를 읽고, 그다음에 고르고
되돌리고 복사하고, 이미 쓰는 도구에 붙입니다.

```txt
읽기            JSON Document
  ↓
편집            Selection · History · Clipboard · Topology
                Intent                     (TBD)
  ↓
외부 확장       Connector
```

왜 이런 문을 만들었는지는 [Why](overview.md)에 있습니다. 읽기 층의
호출은 [API](api.md)에, 따라 하는 예제는 [Quickstart](quickstart.md)에
있습니다.

편집 층의 잎은 각자 한 문서입니다. [Selection](selection.md)은 지금
다루는 대상입니다. [History](history.md)는 값과 선택을 같이
되돌립니다. [Clipboard](clipboard.md)는 고른 것의 구조화된
payload입니다. [Topology](topology.md)는 화면에 보이는 줄입니다.

바깥은 [Connector](connectors.md)입니다. Connector를 빼도 JSON
Document는 그대로 읽히고, Selection과 History와 Clipboard는 그대로
동작해야 합니다.

## Intent (TBD)

읽기 층의 문은 `commit`입니다. 편집 층의 문은 아직 하나로 모이지
않았습니다. 지금은 편집기마다 Intent가 있습니다. 구현은 다른 이슈에서
다룹니다.
