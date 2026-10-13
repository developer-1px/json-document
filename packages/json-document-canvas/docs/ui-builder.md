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
