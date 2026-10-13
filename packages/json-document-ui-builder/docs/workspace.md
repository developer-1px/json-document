# UI Builder Workspace

`UIBuilderWorkspace`는 상단의 실행·화면·데이터·액션·스킬 탭을 제공한다.
Canvas의 `UIBuilderHand`와 `DatabaseHand`를 조합하며, 모든 확정된 변경을
Editing의 `applyUIBuilderMaterials`와 Object history에 저장한다.
Host는 저장소, 생성기, 채팅 연결을 주입한다.

```tsx
import { createUIBuilderEditor, createUIBuilderMaterialTools } from "@interactive-os/json-document-editing";
import { UIBuilderWorkspace, createFakerSampleGenerator } from "@interactive-os/json-document-ui-builder";
import "@interactive-os/json-document-ui-builder/ui-builder-workspace.css";
import "@interactive-os/json-document-canvas/canvas-hand.css";
import "@interactive-os/json-document-canvas/ui-builder.css";
import "@interactive-os/json-document-database/styles.css";

const editor = createUIBuilderEditor({profile: "canvas/1", width: 1200, height: 900, objects: []});
const generateSamples = createFakerSampleGenerator();
const tools = createUIBuilderMaterialTools(editor, generateSamples);
<UIBuilderWorkspace editor={editor} generateSamples={generateSamples} />;
```

## 데이터

테이블 이름과 필드를 정의한 뒤 예시 행을 추가한다. 텍스트 필드는 이름·이메일·회사·상품·문장·날짜·URL 또는 자동 추론을 선택한다.
숫자·참/거짓·선택 값은 해당 타입을 따른다. 선택 값은 스키마에 등록된 옵션 ID다.
Faker는 인스턴스별 한국어 → 영어 → base 로케일을 사용한다. 일부 데이터는 영어다.
선택적 seed는 재현 가능한 예시를 만들며 다른 인스턴스에 영향을 주지 않는다.
날짜 예시는 2026년 범위다. 생성 결과는 실제 연결 데이터가 아니다.

추가 생성은 기존 행을 보존한다. 전체 재생성은 명시적 확인 뒤 기존 행을 교체한다.
직접 셀을 편집하거나 빈 행을 추가할 수 있다. 스키마 변경은 호환되는 필드 ID의 값을 유지하고,
새 필드·호환되지 않는 타입은 Database 기본값으로 채운다. 스키마 변경 시 보기 설정은 전체 보기로 초기화한다.
한 테이블은 50필드·1,000행까지다. 삭제·재생성도 실행 취소할 수 있다.

## 액션·스킬

이름·설명과 입력·출력 계약을 등록하고, 주입된 스킬·대상 테이블·읽고 쓸 필드·필수 입력을 연결한다. 실행 탭의 버튼은 이 계약을 사용한다. 서버 인증이나 실제 Jira 연결은 Host port의 책임이다.

## Usage와 Source

아래 application은 공개 API를 소비한다. Source에서 Host 구성과 정본 구현을 확인할 수 있다.

```live-demo
/applications/ui-builder
```

## 자유 배치와 실행

화면 탭에서 요소를 absolute로 자유롭게 놓고 `알아서 정리`를 누르면 Host가 주입한 `arrange(signal)`이 AI 정리를 수행한다. AI는 콘텐츠와 편집 위치에서 행·열·순서·너비 정책을 결정해 저장하고 실행 탭으로 전환한다. 편집 좌표는 그대로 유지된다. 디자인·정리에서 편집 좌표용 카탈로그 프리셋을 직접 적용할 수도 있다. 데이터·액션 연결 팝오버는 선택한 요소의 지원 슬롯만 보여준다. 데이터에 연결한 내용은 데이터 탭에서 바꾼다.

`UIBuilderRuntimeHand`는 편집기와 같은 `UIComponentSurface`와 바인딩 projection을 재사용한다. Object의 `resolveUIFlowLayout`이 정한 구조를 실제 Grid 행과 Flex 열로 렌더링한다. 높이는 모두 콘텐츠에 맞춰 Hug하며 결과가 길어지면 뒤의 요소가 밀려난다. 버튼 등은 너비도 Hug하고 본문·입력 등은 열을 채운다. 720px 이하에서는 열을 수직으로 쌓는다. 고정 편집 높이와 절대 좌표는 실행에 사용하지 않는다.

목록의 행 선택, 입력/선택 값 저장, 액션 실행·취소·결과 안내를 제공한다. `selection`/`onSelectionChange`는 실행 중 행 선택을 제어한다. Workspace가 이를 보관해 탭 이동에도 유지한다. 선택 자체는 문서 변경이 아니며 history에 넣지 않는다.

`UIBuilderStorageControls`는 자동 저장 상태·재시도·JSON 백업·복원을 제공한다. 파일 해석은 Web, 문서 검증과 undo 가능한 교체는 Editing을 소비한다. Host는 IndexedDB 저장 연결을 주입한다. 브라우저 데이터를 지우면 로컬 저장은 사라지므로 이동·보관용으로 파일을 내려받을 수 있다.

`/applications/ui-builder?example=briefing`은 공개 API로 조립한 개밥먹기 예제다. Jira 업무 3건 → MOCK 브리핑 → 세 가지 처리 방향 → MOCK 결과 저장을 제공한다. 업무마다 값이 분리되고 새로고침 후 복원된다. 일반 빌더 문서와 별도 저장 키를 사용한다. 업무별 UI나 명령 구현을 Host에 만들지 않는다.
