# Concept Map

이 문서 트리는 아래 순서로 읽습니다. JSON 값을 다루는 계약에서 시작해,
편집과 실행 환경에 필요한 책임을 더하고, 마지막에 사람이 직접 다루는
artifact를 만듭니다. Collaboration은 이 흐름과 분리해 읽습니다.

```txt
JSON Document
  값 · 주소 · 변경 · 구독
        ↓
Editing
  Intent · Selection · Topology · Clipboard · History
        ↓
Adapter
  브라우저 플랫폼 계약
        ↓
Connector
  라이브러리 생태계 연결
        ↓
Affordance
  키보드와 포인터의 입력 문법
        ↓
Hands
  artifact 장르별 편집 도구
        ↓
Artifact
  사람이 보고 고치는 최종 결과

────────────────────────────────
Collaboration
  같은 Core 계약의 협업 구현
```

화살표는 책임이 쌓이는 방향을 나타냅니다. Adapter와 Connector는 실행
환경에 맞춰 고릅니다. Collaboration은 이 흐름의 다음 계층이 아닙니다.
JSON Document와 같은 Core 계약을 협업 방식으로 구현하므로 구분선 아래에
따로 둡니다.

## JSON Document

JSON Document는 현재 값을 보관하고, JSON Pointer와 JSONPath로 위치를 찾고,
JSON Patch를 검사해 적용합니다. 적용된 변경은 구독자에게 전달합니다.

이 계약에는 화면이나 편집 장르가 들어가지 않습니다. 문서, 표, 보드의
생김새가 달라도 값의 주소와 변경 형식은 여기서 같습니다. 공개 호출은
[API](api.md)에 정리되어 있습니다.

## Editing

Editing은 문서 값 옆에 편집 중에만 필요한 상태를 둡니다. 화면에서 들어온
요청은 Intent가 되고, Selection은 대상을, Topology는 보이는 순서를,
Clipboard는 옮길 내용을 기억합니다. History는 값과 선택을 함께 되돌립니다.

Editing은 화면을 그리지 않습니다. 화면이 보낸 Intent를 현재 문서와 편집
상태에 적용합니다. 시작점은 [Intent guide](intent-guide.md)입니다.

## Adapter

Adapter는 keyboard, clipboard, contenteditable 같은 플랫폼 계약을 공개
API에 맞춰 번역합니다. 예를 들어 key chord는 의미 command가 되고,
브라우저의 clipboard event는 Editing의 copy, cut, paste로 이어집니다.

플랫폼마다 다른 event와 lifecycle은 [Adapter](adapters.md)가 맡습니다.

## Connector

Connector는 React, Zod, Ajv, TanStack Table처럼 이름 있는 라이브러리의
입출력을 기존 계약에 연결합니다. 문서 변경을 React 구독으로 전달하거나,
화면에 보이는 행과 열을 Sheet의 Topology로 바꾸는 식입니다.

라이브러리를 교체해도 문서와 편집 계약은 바뀌지 않습니다. 지원 범위는
[Connector](connectors.md)에 있습니다.

## Affordance

Affordance는 고르기, 입력하기, 접기, drag, undo처럼 사람이 이미 알고 있는
조작을 정의합니다. Adapter가 플랫폼 event를 번역한다면, Affordance는 그
event를 어떤 입력 문법으로 해석할지 정합니다.

화면의 모양은 host가 정합니다. 입력의 의미와 조합은
[Affordance](affordance.md)에서 다룹니다.

## Hands

Hands는 Core 위에서 사람과 agent가 artifact를 다루는 편집 도구입니다.
Order는 한 줄 목록을 집어 옮기고, Object는 key를 고치며, Tree는 가지를
접습니다. Composer는 agent에게 지시와 맥락을 건네는 손이고, Mention은
안정적인 대상을 글 안에 넣는 손입니다. 둘은 아직 TBD입니다.

Hands는 App이나 완성된 제품 화면의 목록이 아닙니다. 한 장르에서 필요한
조작이 함께 동작하는 최소 단위입니다. 현재 목록은 [Hands](hands.md)에
있습니다.

## Artifact

Artifact는 아래 계층을 조합해 사람이 보고 고칠 수 있게 만든 결과입니다.
MD, PPT, Sheet는 서로 다른 화면과 Hands를 사용해도 같은 문서와 편집 계약을
공유할 수 있습니다.

현재 Artifact 페이지는 파일 포맷 호환성을 약속하는 구현이 아니라
prototype입니다. 앞의 계약들이 최종 경험에서 어떻게 만나는지 확인하는
자리입니다.

## Collaboration

Collaboration은 JSON Document 계약을 여러 참여자의 인과 변경으로 구현합니다.
로컬 구현과 마찬가지로 값을 읽고, 변경을 적용하고, 결과를 구독하지만 내부
기록은 참여자의 변경 순서와 수렴을 다룹니다.

위치가 Artifact 다음인 것은 의존 방향이 아니라 문서 분류를 나타냅니다.
협업 구현을 붙여도 위 계층이 새 문서 API를 배울 필요는 없습니다. replica와
협업 History의 경계는 [Collaboration](collaboration.md)에 있습니다.
