# UI Builder Workspace

`UIBuilderWorkspace`는 상단의 화면·데이터·액션·스킬 탭을 제공한다.
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

이름·설명과 입력·출력 필드 계약을 등록·수정·삭제한다. 이 단계는 AI가 참고하는 기능 목록이며,
서버 실행·인증·외부 API 연결은 제공하지 않는다. 화면 데이터 바인딩도 아직 연결하지 않는다.

## Usage와 Source

아래 application은 공개 API를 소비한다. Source에서 Host 구성과 정본 구현을 확인할 수 있다.

```live-demo
/applications/ui-builder
```
