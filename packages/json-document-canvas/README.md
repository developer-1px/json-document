# Canvas Hand

`@interactive-os/json-document-canvas`는 한 장의 Object Canvas 프로파일에서
글자·사각형·타원·그리기를 완성하는 React Hand입니다. 별도 Canvas editor나
selection/history 구현을 만들지 않고 기존 `createObjectEditor`를 사용합니다.
재사용 가능한 Plane Select profile로 다중 선택·Alt 복제·Shift 축 고정·방향키 이동을,
Object Editing과 Web Clipboard로 선택 copy/cut/paste·Mod+D·Undo/Redo를 연결합니다.
외부 텍스트와 PNG/JPEG/WebP 붙여넣기, 포함된 이미지·글의 HTML 순서 보존,
반복 paste 배치와 비동기 취소도 정본 API를 사용합니다. 외부 이미지 URL은 가져오지 않습니다.

```tsx
import { useState } from "react";
import { createObjectEditor } from "@interactive-os/json-document-editing";
import { CanvasHand } from "@interactive-os/json-document-canvas";

function Slide() {
  const [editor] = useState(() => createObjectEditor({ profile: "canvas/1", width: 1280, height: 720, objects: [] }));
  return <CanvasHand editor={editor} creationStyle={{ color: "#b6c8e8", textColor: "#253044", fontSize: 36, strokeWidth: 4 }} />;
}
```

CSS와 레이아웃은 Host가 결정하고 controls는 기존 UI Primitives를 소비합니다.
슬라이드 크기와 색은 문서/제품 값입니다. [API 계약](docs/api.md)과
[실제 Usage/Source](https://developer-1px.github.io/json-document/docs/api/canvas)를 참고하세요.
