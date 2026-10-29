# UI Builder Hand

`UIBuilderHand({ editor })`는 등록 컴포넌트를 추가·선택·이동·크기 조절하고 내용을 편집하는 Canvas Hand입니다. 줌과 레이아웃 설정을 노출하지 않습니다. 더블 클릭 또는 내용 편집으로 문구·항목·강조를 바꿉니다. Ctrl/Meta+Z, 복제·삭제와 구조화된 clipboard는 기존 Canvas/Object 계약을 사용합니다.

```tsx
import { createUIBuilderEditor, createUIBuilderTools } from "@interactive-os/json-document-editing";
import { UIBuilderHand } from "@interactive-os/json-document-canvas";
import "@interactive-os/json-document-canvas/canvas-hand.css";
import "@interactive-os/json-document-canvas/ui-builder.css";
const editor = createUIBuilderEditor({ profile: "canvas/1", width: 1200, height: 900, objects: [] });
const tools = createUIBuilderTools(editor);
// tools를 agent transport에 연결한다.
<UIBuilderHand editor={editor} />;
```

`UIComponentView({ object })`는 `ui-component/1` embedded object를 canonical UI primitives로 투영합니다. 컴포넌트는 디자인 대상이며 입력·버튼의 실제 서비스 동작은 실행하지 않습니다. 코드는 생성하거나 실행하지 않습니다. 카탈로그와 속성 validation은 Object Document가 소유합니다.

`CanvasHand`의 `navigation="fixed"`는 1 Canvas 단위 = 1 CSS pixel을 유지합니다. wheel/trackpad와 Space drag로 작업면을 이동할 수 있지만 zoom/fit은 실행하지 않습니다. `creationTools`, `toolbarContent`, `documentControls`, `contentToolbar`로 노출할 조작을 구성합니다. `renderEmbedded`, `onEditEmbedded`로 등록 문서의 projection과 편집을 주입하고 `onViewportChange`로 보이는 좌표를 관찰합니다. 생략하면 기존 Canvas 동작이 유지됩니다.

Usage와 Source: [UI Builder](/applications/ui-builder).

```live-demo
/applications/ui-builder
```

## 동일한 컴포넌트의 편집·실행

`UIComponentSurface`는 HTML 콘텐츠의 정본이다. 선택적인 `designId`, `issues`, `interaction: UIComponentInteraction`을 받는다. 기본 `layout="flow"`에서는 높이가 콘텐츠를 따르며 긴 글·결과·입력으로 늘어난다. `UIComponentView`는 이 surface를 `layout="absolute"`로 감싸 편집 좌표와 크기의 SVG foreignObject에 배치한다. 두 모드가 같은 컴포넌트 표현을 사용한다.

interaction이 없으면 inert인 편집 콘텐츠이고, 있으면 canonical Field/Choice/Command에 실행 콜백을 연결한다. 입력·행 선택·버튼 이벤트만 전달하며 데이터 저장이나 스킬 실행을 소유하지 않는다. 빈 바인딩 결과에는 작업 안내를, 깨진 참조에는 오류를 표시한다.

`UIBuilderHand.toolbarContent`에 Host가 데이터 연결 컨트롤을 조합할 수 있다. 데이터에 연결된 문구 편집은 비활성화하고 데이터 탭을 안내한다.

## 공통 디자인

등록 컴포넌트의 표현은 UI Primitives의 `design-system.css`와 `contentPresentation`을 사용한다. 같은 글꼴과 역할별 토큰을 편집·실행 모두 사용한다. 콘텐츠는 기존 제목 40px·섹션 제목 20px·본문 16px·주요 수치 40px의 읽는 위계를 유지한다. 버튼·입력 등 조작은 공통 14px 컨트롤을 사용한다. 카드·숫자·목록은 정본 콘텐츠 역할을 조합하며 로컬 크기나 장식을 덧씌우지 않는다. Canvas CSS는 위치와 크기, 입력의 배열, 깨진 참조 안내만 소유한다.

`UIBuilderHand`는 현재 편집 페이지의 컴포넌트만 표시합니다. `CanvasHand.objectIds`는 표시와 선택 대상을 제한하고 editor의 전체 문서를 보존합니다. 새 컴포넌트는 현재 페이지에 추가되며, 페이지 이동 컴포넌트의 내용 편집에서 목적지를 선택합니다.

## 실행 화면 위의 편집

`UIScreenEditLayer({ editor, object, editable, origin, children })`는 실행 콘텐츠를 그대로 마운트한 채 편집 조작만 겹친다. `origin: UIScreenEditBounds`는 편집에 들어갈 때 실행 DOM에서 측정한 페이지 기준 `x/y/width/height`이며 편집 세션 동안 유지한다. Host는 같은 측정값을 ObjectEditor 문서의 객체 좌표에 기록한다. `editable=false`에서는 자연스러운 flow로 실행하고, `editable=true`에서는 측정한 원래 flow 공간을 보존하면서 콘텐츠에 `transform: translate(...)`와 크기를 적용한다. 자식의 key나 컴포넌트를 모드마다 교체하지 않아 입력값·선택·결과 상태를 유지한다.

`UIScreenEditLayer`는 입력·선택·gesture를 소유하지 않는 수동 projection이다. `CanvasHand.screenOverlay`가 기존 `CanvasHand`의 `useCanvasHand`, `CanvasObjectTarget`, `CanvasResizeTarget`을 그대로 사용해 marquee, Shift 멀티선택, 집합 이동, 여덟 방향 resize, 키보드, clipboard와 undo/redo를 제공한다. Canvas 미리보기 객체를 `onObjectsChange`로 부모에 전달하면 동일한 HTML 콘텐츠가 그 좌표를 투영한다. SVG에는 본문이나 foreignObject를 다시 렌더링하지 않는다. overlay의 `width/height`와 viewBox는 같은 flow 작업면의 크기를 사용하며 별도의 viewport·스크롤 상태를 만들지 않는다. 자유 편집은 겹치는 배치도 허용한다. 실행으로 돌아갈 때 AI 정돈 여부와 정책은 Host가 결정한다.

```tsx
import { UIScreenEditLayer, CanvasHand, UIComponentSurface, UIBuilderScreenControls } from "@interactive-os/json-document-canvas";

<UIScreenEditLayer editor={editor} object={object} editable={editing} origin={origins.get(object.id)}>
  <UIComponentSurface object={object} interaction={interaction} />
</UIScreenEditLayer>;
<CanvasHand editor={editor} objectIds={pageObjectIds} creationStyle={creationStyle}
  screenOverlay={{ width: screenWidth, height: screenHeight, onObjectsChange: setPreviewObjects }}
  renderEmbedded={() => null} onEditEmbedded={editComponent} creationTools={[]}
  documentControls={false} contentToolbar={false} />;
<UIBuilderScreenControls editor={editor} pageId={currentPageId} />;
```

`UIBuilderScreenControls({ editor, pageId })`는 현재 페이지에 대한 추가·내용 편집·복제·삭제·실행 취소·다시 실행을 정본 UI Primitives로 제공한다. 화면 렌더링이나 실행 상태를 소유하지 않으므로 별도의 Canvas 화면 없이 실행 화면 편집에 조합한다. 실제 Usage와 Source는 [briefing UI Builder](/applications/ui-builder?example=briefing)에서 확인한다.

## 레코드 피드

`record-list`의 `props.presentation`은 `"fields"`(기본 필드 목록) 또는 `"feed"`를 받는다. feed는 `collection.fieldIds` 순서를 콘텐츠 역할로 사용한다. 첫 필드는 제목, 두 번째 필드는 요약 본문, 나머지는 필드명과 값을 함께 표시하는 보조 정보다. 각 레코드는 정본 `SelectableItem` 한 개이며 기존 선택 표시와 `onSelectRecord` 연결을 유지한다. 제목·본문·보조 정보는 `contentPresentation`의 heading/body/caption/group을 사용한다. 기본 record-list와 detail-list의 필드별 표시는 바뀌지 않는다.

Usage와 Source: [업무 피드](/applications/ui-builder?example=issue-feed). `UIComponentCollection`이 feed와 필드 목록의 값 포맷과 선택 조합을 함께 소유한다.

Canvas의 조작·history·도구 전환 후 surface 포커스 복귀는 `preventScroll`을 사용한다.
스크롤된 화면에서 포커스 반환이 문서 원점을 화면 안으로 자동 이동시키지 않도록 한다.
실제 Chrome 좌표 클릭과 방향키·Undo에서 scrollTop 246 유지가 확인됐다.
브라우저 locator click의 자동 scrollIntoView는 제품 포커스 동작과 분리해 관찰한다.

UIScreenEditLayer는 중첩된 부모의 화면 이동량을 context로 전달한다. 자식은 문서상 전체 이동량에서 부모 이동량을 뺀 transform만 적용해 부모·자식 동시 선택 시 이중 이동을 방지한다. subtree 이동과 preview의 대상 계산은 기존 objectSubtreeIds가 소유한다. 전체 카탈로그 group의 키보드 부모·자식 선택 이동에서 양쪽 x가 32에서 33으로 변경되는 것을 확인했다.

`title`은 페이지 제목 역할이고 `heading`은 섹션 제목 역할입니다.
heading은 `contentPresentation.heading`으로 렌더되어 페이지 제목의 위계를 중복하지 않습니다.

record-list와 table은 collection.selectionOutsideQuery가 참일 때 현재 선택이
목록 조건 밖이라는 짧은 status를 표시한다. 기존 caption 토큰을 사용하고 기본
상태에는 안내를 추가하지 않는다. 이는 사용자 편집으로 항목이 필터에서 사라져도
같은 업무의 상세를 유지하는 맥락을 설명한다.

## 편집 중 겹침 해소

`CanvasHand.collisionGroups`는 `{objectIds, gap}` 목록으로 겹침 해소 범위를 지정한다.
기존 drag·resize·키보드 이동에서 선택한 요소의 위치를 유지하고 같은 그룹의 겹친
주변 요소를 아래로 민다. 조합의 자식은 함께 이동한다. 미리보기와 commit이 정본
`resolveObjectCollisions`를 공유하며 이동과 연쇄 밀기는 한 번의 Undo로 되돌린다.
UI Builder는 현재 표시된 flow 열을 그룹으로 전달한다. 다른 열 및 선택한 요소들
사이의 의도적인 겹침은 이 단계에서 재배치하지 않는다. AI 정돈은 별도로 실행한다.

### 레이블 관계와 독립 CSS 사용

`canvas-hand.css`와 `ui-builder.css`는 UI Primitives 정본 `design-system.css`를 가져옵니다. Color StyleValue의 레이블·팔레트·입력, 컬렉션의 필드명·값은 `contentPresentation.group`(8px)을 사용합니다. Host의 전역 스타일을 전제로 레이블 간격을 생략하지 않습니다.
