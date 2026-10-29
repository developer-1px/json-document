# Applications

Application은 navigation, workflow, runtime과 제품 정책을 소유하는 완성된 제품
표면입니다. Artifact는 Application과 같은 앱이 아니라, 그 안에서 사람이 만들고
수정하며 agent와 주고받는 콘텐츠입니다.

## Bear

[Bear Application](/applications/bear)은 가운데 Markdown
문서를 보여줍니다. 개발 서버에서는 우하단 채팅으로 본문 추가와 부분 수정을 요청할 수 있습니다. `MarkdownEditingSurface`, `createTextEditor`,
`createJSONDocument`의 public API를 조합하며 입력·선택·문법 표시·Undo는 각
canonical package가 소유합니다. Application은 문서 초기값, 본문과 채팅 배치, 로컬 에이전트 연결을 소유합니다. 문서 도구는 Editing의 `createTextEditorTools`를 사용하며 편집 결과를 Undo로 되돌릴 수 있습니다.
`createWebStoredDocument`로 이 브라우저에 자동 저장하며 새로고침해도 본문이 복원됩니다.
저장 실패와 복원 실패는 화면에 표시합니다. Markdown 저장 링크로 다운로드할 수 있습니다.
개발 서버에서는 파일 이름을 정해 `.local/bear/`에 실제 `.md`를 생성·저장하고 목록에서
불러올 수 있습니다. `BEAR_DOCUMENTS_DIR`로 보관함을 지정할 수 있습니다. 파일 저장은
브라우저 자동 저장과 별개이며, 외부에서 변경된 파일을 바로 덮어쓰지 않습니다.
브라우저 저장소를 지우거나 다른 브라우저/주소를 사용하면 저장된 문서가 공유되지 않습니다.
Undo 이력과 채팅 이력은 현재 페이지 안에서만 유지됩니다.
[작성 예제](/applications/bear?document=ai-native-writing)는 로컬 Codex가 실제 편집 도구로
작성한 「AI native로 글을 쓰는 법」입니다. 내 글과 별도 저장되며 자유롭게 수정할 수 있습니다.

## Canvas

[Canvas Application](/applications/canvas)은 텍스트·도형·이미지·표를 배치하고
AI와 함께 편집하는 전체 화면 작업 공간입니다. 문서와 대화를 브라우저에 보관하며,
사이트 메뉴로 다른 Application과 문서에 이동할 수 있습니다.

하단의 `새 대화`로 독립된 대화 창을 추가합니다. 각 제목 줄을 눌러 따로 펼치거나
접으며, 화면에 들어가는 여러 창을 나란히 확인합니다. 좁은 화면에서는 최근에 연
대화를 표시합니다. 접힌 대화도 작업과 입력 초안을 유지하고 제목 줄에 작업 중·완료·
확인 필요 상태를 표시합니다. 완료되어도 창을 강제로 펼치지 않습니다. 대화 목록·선택과
각 대화의 기록은 이 브라우저에 보관합니다. 기존 대화는 `대화 1`로 유지합니다.
사람과 각 대화는 독립된 Collaboration actor입니다. 대화는 마지막 `read_canvas`의
인과적 관찰 시점을 유지한 채 변경을 작성하고 공유 복제본에 병합합니다. 다른 객체나
서로 다른 필드의 수정은 전체 문서를 다시 읽으라는 오류 없이 함께 반영됩니다.
같은 필드의 동시 수정은 결정적으로 수렴하고 충돌 대안을 이력에 보관하며,
`collaboration.conflict`를 도구에 반환합니다. 삭제로 보이지 않게 된 대상과 적용 제외도
성공으로 보고하지 않습니다. 모델은 병합 결과를 읽고 의도를 재검토해야 합니다.

Undo는 사람·대화별 이력에만 적용됩니다. 문서·협업 checkpoint를 함께 보관하므로
새로고침 뒤에도 각 참여자의 이력을 복원합니다. 기존 plain JSON 저장 데이터는
내용을 보존하여 checkpoint 형식으로 이행합니다. 이 조합은 한 페이지의 여러 참여자를
대상으로 하며, 브라우저 탭·기기 사이의 전송과 동기화는 포함하지 않습니다.

Application은 저장 정책, 에이전트 연결과 화면 조합을 소유합니다.
[Canvas API](/docs/api/canvas)는 재사용하는 `CanvasHand`와 viewport를,
[Editing API](/docs/api/editing)는 객체 편집 명령과 에이전트 도구를 소유합니다.
앱과 API 문서는 서로 다른 계층이며, API의 Usage/Source에서 앱의 공개 API 사용을 확인할 수 있습니다.

## Calendar

[Calendar Application](/applications/calendar)은 Calendar Document Type, Editing,
Calendar Hand와 UI primitives를 day·week·month·year 제품 경험으로 조합합니다.

```text
Calendar Application
├─ Calendar Document Type · event, recurrence, interval
├─ Calendar Hand · selection, create, move, resize, history
├─ Calendar UI · grids, inspector, date controls
└─ App-owned · navigation, URL state, copy, fixture, layout
```

Calendar라는 이름 아래의 모든 코드를 App이 소유하지 않습니다. 재사용 책임은
각 canonical package에 남고 Application은 제품 조합과 정책만 소유합니다.

## AI Agent

[AI Agent Application](/applications/ai-agent)은 session runtime에 Markdown, AG-UI와 A2UI projection을 조합합니다.
현재 입력은 Host의 textarea와 UI Primitives이며 Composer Hand 연결을 완료한 상태가 아닙니다.

```text
AI Agent Application
├─ 입력 · textarea와 UI Primitives
├─ Markdown React · 응답 표시
├─ AG-UI → A2UI integration
└─ App-owned · session navigation, runtime connection, shell, policy
```

Application은 showcase가 아니라 책임을 발견하고 canonical API가 실제 제품에서
다시 소비되는지 검증하는 production composition root입니다. 개발 순환은
[How We Build](/docs/how-we-build)에서 설명합니다.

## UI Builder

[UI Builder](/applications/ui-builder)는 등록 컴포넌트를 자유롭게 배치하고 우측 하단 채팅으로 생성·정리를 요청하는 애플리케이션입니다. 컴포넌트를 추가하고 드래그·크기 조절하거나 더블 클릭으로 내용을 수정합니다. 줌과 레이아웃 구조 설정은 없습니다. 변경은 브라우저에 저장되며 AI batch도 실행 취소할 수 있습니다. 실제 AI 편집은 `npm run dev`의 로컬 agent 연결이 필요합니다. 배포된 정적 사이트에서는 직접 편집은 가능하지만 로컬 agent API는 제공되지 않습니다.

## Slides

[Slides](/applications/slides)는 원문 위에 교정을 남기면 에이전트가 순차 처리하는
첨삭 애플리케이션이다. 점·영역·자유선·화살표와 텍스트 또는 Chrome 음성 입력으로
지시를 남기고, `첨삭 맡기기`로 대기열에 저장한다.

원문과 표시는 검토 중 고정된다. 에이전트는 별도 replica에서 수정하고, 원문이
달라지지 않았을 때만 공개한다. 앞선 첨삭의 알려진 변경은 다음 작업의 원문으로
이어진다. 외부 변경·대상 삭제·수정 없는 응답은 확인 필요로 남긴다.

각 첨삭은 대기·수정 중·확인 대기·확인 완료·확인 필요 상태를 가진다.
대기 중인 작업이 끝나면 수정안을 자동으로 보여준다. 새 지시를 작성 중이면 화면을
전환하지 않는다. 결과 보기는 해당 작업의 결과를 보여주며, 모든 첨삭을 확인하면
최신 원문에서 바로 다음 첨삭을 시작할 수 있다. 완료한 첨삭은 접힌 기록에 남는다. 첨삭과 원문은 로컬에 보관하며, 중단된 실행은 자동 재실행하지 않는다.
현재 한 탭의 순차 실행을 지원한다. 여러 탭의 작업자 조정, PPTX 입출력, 정확한
문자 범위 취소선·대체문구 전용 도구는 아직 제공하지 않는다.

정본 UI는 `AnnotationReview`다. `AnnotationReviewGroup`은 페이지 사이에서 하나의
지시 입력창만 활성화한다. `createAnnotationReviewSession`이 원문과 표시를 소유하고,
`createAnnotationReviewQueue`가 작업 상태·순차 실행·알려진 원문 계보를 소유한다.
`createCollaborationCanvasReview`가 수정안 격리·원문 충돌 검사·공개를 담당한다.
Slides는 저장 키, 콘텐츠 렌더러, 페이지 배치와 LLM 전송·프롬프트 정책만 주입한다.

### 첨삭 흐름의 정본 책임 감사

범위는 `/applications/slides`, `/demo/annotation`과 두 경로가 호출하는 Annotation,
Editing, Composer, Web, Collaboration의 첨삭 실행 경로다. 전체 Canvas 기능이나
다른 앱의 일반 채팅은 포함하지 않는다. 아래 13개 책임 발생 지점을 조사했고,
기존 정본 소비 4개·Host 조합 1개·범위 밖 1개를 유지하고, API gap 5개와
정본 부재 2개를 아래 소유자로 이관했다. 경로 이름이나 단일 소비자 여부가 아닌
모델·판단·수명주기를 기준으로 분류했다.

| 발생 지점 / 역할 | 소유 지식·판단·상태 및 변경 이유 | 초기 분류 | 최종 정본 / 입력 → 출력 |
| --- | --- | --- | --- |
| SlideProof.source / 고정 원문 | 원문·표시의 같은 버전, 저장 복원·검증 | canonical API gap | Editing.createAnnotationReviewSession / 원문·복원 값 → 세션 |
| SlideProof / 검토 화면 전환 | 작성 중 결과 전환 금지, 확인 뒤 다음 버전 | missing canonical module | Annotation.AnnotationReview / 세션·큐·현재 원문 → 검토 UI |
| ProofInstruction / 지시 입력 | 입력·제출·취소·음성의 결합 수명주기 | canonical API gap | AnnotationReview → Composer / 지시 → enqueue |
| SlidesApplication.activeProofId / 입력창 조정 | 여러 페이지 중 하나의 입력창만 활성 | missing canonical module | AnnotationReviewGroup / 페이지 활성 → 입력창 표시 |
| SlideProof.projection / 이전 버전 렌더링 | HTML 봉투·viewport·객체 정체성 보존 | canonical API gap | Editing.projectCanvasHTML / 객체·원문·영역 → 투영 |
| slidesReviewAgent.known / 원문 계보 | 성공한 동일 페이지 작업만 연결 | canonical API gap | Editing.AnnotationReviewQueue.sourceFor / 작업 → 예상 원문 |
| slidesReviewAgent / 수정안 공개 | 격리·허용 페이지·취소·동시 변경·실제 변경 검사 | canonical API gap | Collaboration.createCollaborationCanvasReview / executor → 안전한 worker |
| SlidesApplication.reviews / 작업 큐 | 대기·실행·확인·오류 전이 | canonical consumer | Editing.createAnnotationReviewQueue / 작업 → 결과 상태 |
| Slides 저장 연결 / persistence | 저장 실패·복원·연결 해제 | canonical consumer | Web.createWebStoredDocument / 정본 source → 저장 상태 |
| ChatComposer.speechInput / STT | 브라우저 인식·중간/최종 결과·중단 | canonical consumer | Composer React → Web speech / 음성 → 지시 텍스트 |
| AnnotationHand / 표시 | 선택·그리기·이동·pointer 수명주기 | canonical consumer | AnnotationHand → Affordance·Web·Editing / 입력 → 표시 |
| slidesReviewAgent.execute / LLM 연결 | 제품 프롬프트·도구와 실제 전송 연결 | Host composition | Slides / worker 요청 → LLM 실행 |
| AnnotationDemo.output / 내보내기 | 구조화·raster 출력이며 에이전트 실행이 아님 | out of scope | 기존 useAnnotationOutput 유지 |

`/demo/annotation`의 **에이전트 첨삭 Usage**는 같은 공개 UI로 SVG 텍스트를 검토한다.
이 예제의 worker는 지시를 결과 문자열로 쓰는 명시적인 로컬 fixture다. 실제 HTML
에이전트 수정은 Slides에서 검증한다. 두 경로 모두 Source에서 UI·세션·큐의 정본을
따라갈 수 있으며, 공개 API 설명은 각 소유 패키지의 API reference에 둔다.
Host는 HTML 페이지 구성과 에이전트 권한·원문 확인 정책을 소유한다.

Slides 첨삭은 하나의 관리 에이전트가 답변과 실행 계획을 맡고, 최대 3개의 실행 에이전트가 서로 다른 페이지를 병렬로 수정합니다. 같은 페이지의 작업은 순서대로 실행하며 게시 직전에 원문 충돌을 검사합니다. 완료한 작업과 표시는 완료 기록을 펼쳤을 때만 표시됩니다.

Slides의 연속 첨삭은 관리 에이전트가 지정한 실제 HTML 요소를 문서 위에 표시한다.
실행 중에는 해당 위치에 상태가 나타나고, 반영 뒤에는 입력 첨삭을 숨기고 원문과
결과를 비교한 변경 영역을 표시한다. 위치 옆 응답에서 전후 비교와 되돌리기를
제공하며, 이후 수정이 있으면 되돌리기로 덮어쓰지 않는다. 삭제·스타일시트 변경은
정확한 새 요소 위치를 추측하지 않고 페이지 변경으로 안내한다.

### Slides 음성 첨삭 UI의 정본 경계

검토 범위는 `/applications/slides`의 음성 입력부터 문서 위 대화·수정 표시까지다.
아래 8개 책임을 확인했으며, 일반 Canvas 편집과 다른 애플리케이션 전체를 감사한
결과는 아니다. 인접 Chat Usage와 AnnotationReview Usage는 정본 소비를 비교했다.

| 책임·구현 | 감사 판정 → 반영 | 정본과 경계 |
| --- | --- | --- |
| `createWebSpeechInput` | canonical consumer | Web: STT 이벤트를 final/interim으로 번역 |
| `createAnnotationFollowing` | canonical API gap → 확장 | Editing: 위치가 연결된 interim draft와 final 작업 전환 |
| `createAnnotationReviewQueue` | canonical consumer | Editing: 관리·실행·결과 상태와 보정 |
| `measureWebHTMLReview` | canonical consumer | Web: 실제 HTML 대상과 변경 위치 계산 |
| `FollowingReview` 메시지 | duplicate implementation → 제거 | UI Primitives의 ChatBubble·ChatActivity 소비 |
| `FollowingReview` 패널 | canonical API gap → 확장·이관 | Popover가 dismiss/focus를 소유; 음성 입력 시 autofocus 생략 |
| `useAnchoredFloatingPosition` | canonical consumer | React: 위치 측정 구독, Affordance: 배치 결정 |
| `SlideProof` | Host composition | 공개 AnnotationReview와 CanvasHTMLObject 조합 |

목소리 중간 결과는 위치가 생기는 즉시 그 자리에 발신 말풍선으로 나타난다.
에이전트 요청은 final 결과에서만 시작한다. 위치 표시를 바탕으로 듣고 있다는 사실과
에이전트가 실제 문서 요소를 이해했다는 사실을 같은 상태로 표현하지 않는다.
대화 중 상태 문구를 AI 발언으로 만들지 않으며, 페이지 아래 중복 목록은 접어 둔다.

## Agent Review 실험 페이지

[함께 고치기](/applications/agent-review)는 대상 지정 → 음성 지시 → 에이전트 실행 → 변경 확인 흐름을 독립적으로 사용하는 실험 공간입니다. Applications 메뉴의 Agent Review에서 열 수 있습니다.

Slides와 동일한 Annotation Review·Editing·Collaboration API 및 에이전트 연결을 사용합니다. 문서, 작업 큐, 교정 표시의 저장 공간은 `agent-review`로 분리됩니다. 화면에서는 고칠 곳을 짚고 음성 첨삭을 시작한 뒤, 해당 위치의 응답과 변경 결과를 확인하거나 되돌릴 수 있습니다.

이 페이지의 추가는 네 계약의 표준화 완료를 의미하지 않습니다. 구조화된 관찰, 문서 종류에 독립적인 작업 결과, 반영 보장, 변경 증거의 계약 보완은 별도 구현 대상입니다. 문서 모델이나 작업 수명을 페이지 내부에 새로 구현하지 않습니다.
