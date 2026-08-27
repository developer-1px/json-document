# Hands

## Annotation editor

Raster Annotation의 persistent model과 editing session은
`@interactive-os/json-document-editing`의 `createAnnotationEditor`가 소유합니다.

```ts
const editor = createAnnotationEditor(annotationDocument);
editor.dispatch({ type: "annotation.move", annotationId, dx, dy });
editor.undo();
```

`AnnotationDocument`는 source와 selector geometry, presentation을 직렬화하고,
selection과 undo/redo는 editor snapshot에 둡니다. Point, rectangle, path와 arrow
selector는 geometry의 유일한 정본이며 presentation은 geometry를 반복하지
않습니다. SVG 좌표 변환, pointer gesture, Canvas rasterization과 comment UI는
Editing owner 밖에서 조합합니다.

```ts
const gesture = createGestureSession<AnnotationGesture>();
const point = projectWebClientPointToSVG(clientPoint, viewport);
const raster = await readWebRasterFile(file);
const output = await renderWebAnnotationRaster({ document, sourceId, sourceURL, style });
```

Gesture는 Affordance가 input-independent lifecycle로 소유하고 Pointer capture는
Web pointer session이 소유합니다. SVG projection과 raster file decode는 Annotation
model을 모르며, Canvas 합성만 domain-qualified Web adapter가 selector와
presentation을 번역합니다.

```live-demo
/demo/annotation
```

Hands는 사람이 artifact와 agent를 다루게 하는 장르별 완료 기준입니다.
App도, 단일 화면 component도, 하나의 공통 package도 아닙니다. 실제 제품을
끝까지 만져 보며 발견한 전형적인 인간의 손과 그 조합 증거를 가리킵니다.

Agent가 값을 생성하고 Viewer가 그 값을 보여 주는 것만으로는 artifact가
도구가 되지 않습니다. 사람이 고르고, 쓰고, 옮기고, 맥락을 건넬 수 있을 때
생성된 결과가 이어서 작업할 수 있는 artifact가 됩니다.

```text
Agent output + Viewer           = 볼 수 있는 결과
Agent output + Viewer + Hands   = 이어서 작업할 수 있는 artifact
```

구현이 없는 Hands는 TBD로 남깁니다. TBD는 빈 화면이 아니라 필요한 상황과
사람의 동사, host와 Hand의 경계를 먼저 적은 사용법 명세입니다. 아직 존재하지
않는 package API를 약속하지 않습니다.

## 닫힘 판정

Hands는 다음 증거가 함께 있을 때 닫혔다고 부릅니다.

- 장르 document, Selection과 Intent가 owner package의 공개 계약으로 존재함
- Clipboard/History 등 필요한 editing capability가 연결됨
- 대표 keyboard·pointer Affordance와 browser lifecycle이 실제 Host에서 동작함
- package contract와 Live Demo browser test가 같은 행동을 증명함
- Live Demo fixture가 관찰된 실제 제품 사건에서 유래하고 shape·순서·크기·timing과
  provenance를 보존함. synthetic happy path만으로는 Hands를 닫지 않음
- 반복 책임은 owner package API, 제품 고유 정책은 이름 붙은 Host module에 있음

따라서 “닫힘”은 모든 제품 기능이나 모든 접근성 변형이 끝났다는 뜻이 아닙니다.
현재 장르의 최소 편집 loop가 public contract와 실제 소비 경로에서 함께
성립한다는 뜻입니다. 설치 가능한 package와 실제 source 위치는
[Official Hands](official-hands.md)에서 확인합니다.

## Agent에게 건네는 Hands

| Hands | 관찰한 표면 | 사람이 하는 일 |
| --- | --- | --- |
| [Composer](composer.md) | Cstar composer | 지시와 구조화된 context를 한 턴으로 구성 |
| [Mention](mention.md) | Cstar mention | 이름으로 보이는 안정적인 entity reference atom을 삽입 |

Transcript, 말풍선, think·stream·tool animation은 표현과 runtime lifecycle입니다.
Hands가 아닙니다.

## Hands가 공유하는 Viewport interaction

Cstar의 긴 대화 표면에서 발견한 prepend 위치 보존, streaming follow와 사용자
scroll 중단은 chat 업무 규칙이 아닙니다. Live Demo는 security-filter가 적용된
실제 Codex runtime browser-memory capture의 1,052개 text delta를 87개 원래 chunk
경계와 scaled delay로 재생합니다. 동적으로 늘어나거나 일부만 렌더링되는
여러 Hands가 공유하는 browser interaction입니다. 정본 lifecycle은 논리 anchor의
viewport offset을 보존하고, 안정된 layout의 target을 따라가며, 사용자가 개입하면
자동 follow를 넘겨줍니다. programmatic scroll, settle, supersede, cancel과
watchdog도 같은 session이 구분합니다.

Host는 anchor identity와 follow 정책을 정하고, Affordance와 Web adapter는 제품
의미를 모른 채 lifecycle과 DOM 연결을 소유합니다.

```live-demo
/demo/viewport
```

## Artifact를 다루는 닫힌 Hands

| Hands | 관찰한 표면 | 사람이 하는 일 |
| --- | --- | --- |
| Document | Bear | 줄에 쓰고 옮김. Markdown caret이 전형 |
| [Order](order.md) | Linear | 한 줄 항목을 고르고 옮김 |
| [Object](object.md) | Figma | 안정 ID 객체를 평면에서 고르고 옮김 |
| Sheet | Excel | cell을 고르고 채움 |
| [Tree](tree.md) | Finder | 보이는 가지를 접고 범위를 고름 |
| Kanban | Trello | card를 열 사이로 옮김 |
| [Database](database.md) | Airtable | 같은 record를 저장된 view로 봄 |

Slides, Form, Calendar 같은 App 이름은 먼저 기존 Hands로 분해합니다. 예를 들어
Slides는 Order와 Object의 조합일 수 있습니다. 끝까지 환원되지 않는 인간의
편집 문법이 남을 때만 새 Hands 후보가 됩니다.

전체 흐름은 [Artifact](/viewer) prototype에서 봅니다. Artifact는 적절한
surface를 고르고, Hands는 사람이 만지는 방법을 제공하며, Core는 사람과
agent의 변경을 같은 계약에 남깁니다.

## Live Demo

```live-demo
/demo
```

```live-demo
/demo/sheet
```

```live-demo
/demo/kanban
```
