# Canvas 안의 표

Canvas 도구 모음의 표 아이콘으로 객체를 생성합니다. 클릭은 기본 크기, 드래그는 지정한 크기로 만듭니다. 객체 선택 상태에서는 이동·리사이즈·복제·삭제가 작동하고 더블클릭·F2 또는 선택 타깃의 Enter로 내부 셀 편집에 들어갑니다. 셀 편집 중 Escape는 초안을 취소하고, 셀 선택 상태의 Escape는 Canvas 객체 선택으로 돌아갑니다. 표 끝의 Tab/Shift+Tab도 바깥으로 돌아갑니다.

내부 UI는 Bear와 Sheet 앱이 소비하는 `SheetHand`입니다. Canvas가 별도의 셀 키보드·선택·클립보드 구현을 갖지 않습니다. `CanvasSheetObject`는 SVG foreignObject 프레임, 활성화와 포커스 연결만 조합하며, 활성 여부가 표의 모양과 크기를 바꾸지 않습니다.

```tsx
import {createCanvasSheet, createObjectEditor} from '@interactive-os/json-document-editing';
import {CanvasHand} from '@interactive-os/json-document-canvas';

const table = createCanvasSheet({x:100, y:100, width:480, height:280});
const editor = createObjectEditor({profile:'canvas/1',width:1280,height:720,objects:[]});
editor.dispatch({type:'object.create',object:table});
// <CanvasHand editor={editor} creationStyle={creationStyle} />
```

- Object Document 소유자는 `kind: "embedded-document"`, `documentType`, `document`로 공간 객체와 내장 문서의 경계를 정의합니다. 표 데이터 모델은 중복 정의하지 않습니다.
- Editing의 `createCanvasSheet`가 `sheet/1` 문서를 생성하고, `createObjectSheetEditor`가 부모의 해당 객체에 연결합니다.
- `createProjectedSheetEditor`는 Markdown 표와 Object 표에 공통인 projection·선택·부모 History 연결을 소유합니다. 표 명령 하나는 부모 문서 transaction 하나가 됩니다.
- 바깥 객체 이동/리사이즈와 내부 행열 리사이즈는 별개입니다. 내부 크기는 layout 좌표로 저장하므로 SVG 화면 배율이 저장값에 섞이지 않습니다.

표 내용은 Canvas JSON 안에 저장되며 JSON 재열기·객체 복제·복사/붙여넣기·삭제/Undo에서도 보존됩니다. 알 수 없는 embedded documentType은 임의 편집기를 만들지 않고 지원하지 않는 문서로 표시합니다. Object 소유자는 내장 payload를 보존하며 payload의 구체 모델 검증은 각 편집 어댑터가 소유합니다.

현재 좌표 보정은 Canvas의 축 정렬 SVG viewport 및 CSS 확대/축소를 대상으로 합니다. 회전/기울이기와 수식, Excel 파일 호환성은 지원 범위가 아닙니다. 실제 Usage는 `/demo/canvas`와 `/widgets/canvas`입니다.
