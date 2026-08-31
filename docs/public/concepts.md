# Concept Map

이 사이트의 권장 읽기 순서와 package 의존 방향은 같은 것이 아닙니다.
먼저 Core를 배우고 실제 편집 경험까지 읽어 가지만, 필요한 책임은 아래처럼
Core 주위에 선택적으로 붙습니다.

```txt
                         ┌─ Editing ─ Selection · Intent · History
local JSON Document ─────┤
                         ├─ Document Types ─ profile · model · schema · operations
                         ├─ Adapter ─ platform contract
collaborative Document ──┤
                         ├─ Connector ─ named ecosystem
                         └─ optional domain / UI composition

Affordance ─ input grammar ─┐
UI Primitives ─ standard UI ├─ Host가 장르별 Hands를 조합
Rich Text 등 domain ────────┘

Hands를 surface에 조합한 결과가 사람이 다루는 Artifact가 됩니다. Application은
그 Artifact를 navigation, runtime과 제품 정책에 놓아 실제 제품 경험으로
제공합니다.
```

이 그림의 선은 허용된 의존·조합 방향입니다. 모든 노드를 순서대로 설치하라는
뜻이 아닙니다. Adapter와 Connector는 서로의 선행 계층이 아니며, 각각 플랫폼과
외부 라이브러리가 필요할 때 고릅니다. Collaboration은 다음 계층이 아니라
같은 `JSONDocument` 계약의 다른 구현입니다.

권장 읽기 순서는 `Foundation → Building Blocks → Hands → Artifact → Application`입니다.
Foundation 안에서는 JSON Document, Document Types, Editing과 Collaboration을,
Building Blocks에서는 Adapter, Connector, Affordance와 UI Primitives를 읽습니다.
이 순서는 학습을 위한 서사일 뿐 package dependency를 주장하지 않습니다.
Collaboration은 Core의 대체 구현과 profile 포함 관계로 Foundation 안에서 읽습니다.

프로젝트가 책임을 발견하는 방향은 이 읽기·구현 방향과 반대입니다.

```text
구현 의존: Foundation → Building Blocks → Hands → Artifact → Application
책임 발견: Application → 책임 발견 → Canonical Module → Application
```

먼저 제품을 만들고 실제 사용 흐름에서 반복되는 책임을 찾습니다. 추출된 책임은
canonical owner와 public API를 얻고, Application은 임시 구현 대신 그 API를 다시
소비합니다. 자세한 순환은 [How We Build](how-we-build.md)에서 설명합니다.

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

## Document Types

Document Type은 특정 JSON Document가 무엇을 의미하고 어떤 상태와 변경이
유효한지를 정의합니다. Profile, Document Model, Schema와 invariant,
Document Operation, Projection이 이 책임에 속합니다.

Document Type은 selection, History 같은 편집 lifecycle이나 화면 표현을
소유하지 않습니다. 현재 후보와 아직 결정하지 않은 소유권은
[Document Types · TBD](document-types.md)에 정리되어 있습니다.

## Adapter

Adapter는 keyboard, clipboard, contenteditable 같은 플랫폼 계약을 공개
API에 맞춰 번역합니다. 예를 들어 key chord는 의미 command가 되고,
브라우저의 clipboard event는 Editing의 copy, cut, paste로 이어집니다.

Adapter는 책임 종류입니다. Web Adapter는 Editing을 소비하지만
Contenteditable Adapter는 JSON Document와 DOM/React lifecycle을 직접 잇습니다.
따라서 모든 Adapter가 Editing 다음 dependency라는 뜻은 아닙니다.

플랫폼마다 다른 event와 lifecycle은 [Adapter](adapters.md)가 맡습니다.

## Connector

Connector는 React, Zod, Ajv, TanStack Table처럼 이름 있는 라이브러리의
입출력을 기존 계약에 연결합니다. 문서 변경을 React 구독으로 전달하거나,
화면에 보이는 행과 열을 Sheet의 Topology로 바꾸는 식입니다.

라이브러리를 교체해도 문서와 편집 계약은 바뀌지 않습니다. 지원 범위는
[Connector](connectors.md)에 있습니다. Connector는 JSON Document, Editing,
Hands capability 중 자신이 연결하는 계약에 직접 붙으며 Adapter를 전제로 하지
않습니다.

## Affordance

Affordance는 고르기, 입력하기, 접기, drag, undo처럼 사람이 이미 알고 있는
조작을 정의합니다. 일부 API는 Adapter가 만든 command를 받고, 일부 Web 편의
API는 event-shaped input을 내부 Adapter와 함께 해석합니다. 각 reference의
입력 type이 어느 경계인지 정본입니다.

화면의 모양은 host가 정합니다. 입력의 의미와 조합은
[Affordance](affordance.md)에서 다룹니다.

## Hands

Hands는 Core와 필요한 선택 책임을 조합해 사람과 agent가 artifact를 다루게
하는 장르별 완료 기준입니다.
Order는 한 줄 목록을 집어 옮기고, Object는 key를 고치며, Tree는 가지를
접습니다. Composer는 agent에게 지시와 맥락을 건네는 손이고, Mention은
안정적인 대상을 글 안에 넣는 손입니다. 둘은 아직 TBD입니다.

Hands는 하나의 공통 package나 화면 component 이름이 아닙니다. 장르 document와
Intent, Selection/Clipboard/History, 대표 Affordance, platform lifecycle이 실제
Host 조합에서 함께 동작해야 닫힙니다. 재사용 책임은 owner package API로,
제품 고유 정책은 이름 붙은 Host module로 남습니다. 현재 증거와 목록은
[Hands](hands.md)에 있습니다.

## Artifact

Artifact는 다음 책임 계층이 아니라 앞의 책임을 조합해 사람이 보고 고칠 수
있게 만든 결과입니다.
MD, PPT, Sheet는 서로 다른 화면과 Hands를 사용해도 같은 문서와 편집 계약을
공유할 수 있습니다.

현재 Artifact 페이지는 file compatibility나 Core/Hands interoperability를
증명하지 않는 visual prototype입니다. 여러 artifact surface를 한 Host chrome에
놓는 정보 구조와 시각 가설만 확인하며, 실제 계약 증거는 각 Hands Live Demo와
package test에서 봅니다.

## Application

Application은 Artifact와 Hands를 실제 제품 경험으로 제공하는 최종 composition
root입니다. 주요 화면 영역과 실행 순서, URL과 navigation, 제품 copy와 fixture,
concrete runtime 연결은 Application에 남습니다. 문서의 의미, editing lifecycle,
platform translation과 반복 UI처럼 같은 역할과 책임을 갖는 코드는 canonical
module로 추출됩니다.

[Calendar와 AI Agent](/applications)는 제품에서 발견한 책임과 App에 남은 정책을
함께 보여 줍니다. Calendar Document Type, Calendar Hand와 Calendar Application은
같은 이름을 공유하지만 서로 다른 owner입니다.

## Collaboration

Collaboration은 JSON Document 계약을 여러 참여자의 인과 변경으로 구현합니다.
로컬 구현과 마찬가지로 값을 읽고, 변경을 적용하고, 결과를 구독하지만 내부
기록은 참여자의 변경 순서와 수렴을 다룹니다.

Collaboration은 Foundation 안에서 JSON Document와 같은 계약의 대체 구현으로 읽습니다.
협업 document를 Editing에 주입할 수 있지만 History command는 editor-local
History 대신 actor-local `runtime.history`로 연결해야 합니다. base → History →
Text profile의 포함 관계는 [Collaboration](collaboration.md)에 있습니다.

## Reference vertical: Rich Text

Rich Text는 새 최상위 계층이 아니라 이 책임 graph를 끝까지 적용한 대표
vertical입니다. JSON Document와 Selection/Editing 위에 versioned domain schema를
두고, Web와 React integration을 분리한 뒤 Host UI가 조합합니다. profile,
conformance vector와 browser evidence는 다른 Hands가 경계를 판단할 때 참고하는
구현 증거입니다.
