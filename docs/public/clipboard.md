# Clipboard

Selection과 Topology를 함께 읽으면 사용자가 고른 블록이나 셀을 정확한
순서로 얻을 수 있습니다. 이 데이터를 다른 위치나 다른 앱으로 옮기려면
구조와 텍스트 표현을 함께 담아야 합니다. Clipboard payload가 두 표현을
묶습니다.

## 선택한 내용 복사하기

Document editor에서 `copy()`를 호출하면 선택한 블록의 JSON과 일반 텍스트가
payload에 들어갑니다. Sheet와 Database는 선택한 셀의 JSON과 TSV를 만듭니다.
Order 항목, Object, Tree 노드도 같은 방식으로 구조 JSON과 텍스트를 같이
듭니다. 구조를 이해하는 편집기는 JSON을 사용하고, 일반 텍스트만 받는 앱은
text 또는 TSV를 사용할 수 있습니다.

```ts
const clipboard = editor.copy();

if (clipboard) {
  console.log(clipboard);
}
```

복사는 현재 값을 읽어 payload를 만들기 때문에 `document.value`와 History는
바뀌지 않습니다.

## 잘라내고 붙여넣기

잘라내기는 먼저 같은 payload를 만든 뒤 선택한 내용을 문서에서 제거합니다.
제거가 성공하면 History에 변경이 기록됩니다. Sheet `cut()`은 고른 칸을
비웁니다. Database는 칸을 지우지 않고 복사와 붙여넣기만 합니다. 붙여넣기는
payload의 구조화된 데이터를 새 위치에 적용합니다.

```ts
const cut = editor.cut();

if (cut?.result.ok) {
  editor.dispatch({
    type: "clipboard.paste",
    clipboard: cut.clipboard,
  });
}
```

`cut()`이 돌려준 payload를 붙여넣기 Intent에 넘깁니다. 잘라내기와
붙여넣기는 각각 문서 값을 바꾸므로 History에도 두 작업이 차례로 기록됩니다.

표에서 복사할 때는 [Topology](topology.md)를 함께 넘겨 현재 보이는 직사각형의
행과 열 순서를 유지합니다. [History](history.md)는 이렇게 기록된 문서 값과
Selection을 함께 복원합니다.

## Paste × Image 기본기 — TBD

Clipboard의 기본기는 다른 앱에서 가져온 내용을 편집 가능한 문서로 받아들이고,
다시 다른 앱에 전달하는 과정까지 포함합니다. 아래 TBD는 지원 약속의 목표이며,
현재 API가 모두 구현했다는 뜻은 아닙니다.

| 기본기 | 현재 범위 / TBD | 완료를 판단할 동작 | 정본 |
| --- | --- | --- | --- |
| 이미지 파일 입력 | Canvas·Composer 공통 경로 구현 | PNG/JPEG/WebP를 실제로 읽고 표시하며, 실패 batch는 삽입하지 않음 | File Intake·Web·각 Hand |
| 이미지 내용 보존 | Canvas 객체·Composer 첨부에 포함 | Undo/Redo·JSON 왕복·Composer submit, Canvas 구조 복사 후에도 내용과 치수 유지 | 각 문서 모델·Editing |
| 비동기 편집 | 공통 순서·취소 queue 구현 | 연속 요청 순서 유지, 취소 후 늦은 삽입 없음; Composer는 준비 중 타이핑 가능 | Editing·각 Hand |
| HTML 이미지·글과 이미지 | 일부 구현: 포함된 raster와 Canvas 혼합 입력, Composer 이미지-only | HTML 안의 이미지와 글의 순서를 지원하는 문서 의미로 변환; 읽을 수 없는 이미지는 전체 실패 | Web·Rich Text Web·각 문서 모델 |
| 서식 없이 붙여넣기 | 명시적인 공통 입력 계약 TBD | 서식 붙여넣기와 plain text 선택을 구별하고 native 입력을 침범하지 않음 | Web·Affordance·각 Hand |
| 이미지로 복사 | Canvas TBD | 선택한 글·도형·이미지를 PNG로 복사해 외부 앱에 붙임; 실패가 문서를 바꾸지 않음 | Canvas·Web |
| 실제 플랫폼 왕복 | OS-native 검증 TBD | 스크린샷·브라우저 이미지·Docs/Slides에서 실제 복사하여 붙이고, 외부 앱으로 다시 전달 | Web·제품 경로 검증 |

한 항목의 HTML·텍스트·PNG는 같은 내용의 대체 표현일 수 있습니다. 이를 모두
별개 내용으로 삽입하지 않습니다. 반면 선택한 HTML 표현 안의 글·이미지는 함께
보존해야 할 내용일 수 있습니다. 표현 선택과 문서 내용 변환은 다른 결정입니다.
[Clipboard 표현 모델](https://www.w3.org/TR/clipboard-apis/#clipboard-interface)은
이 구분을 설명합니다. [Docs·Slides의 이미지 복사](https://support.google.com/docs/answer/161768?hl=en)도
외부 앱에는 HTML로 전달되므로 HTML 이미지를 고급 문서 import만의 문제로 보지 않습니다.

현재 Canvas는 구조화 Object → native 이미지 파일 → 이미지가 포함된 HTML → 일반 텍스트
순으로 표현을 고릅니다. 선택한 HTML의 글과 PNG/JPEG/WebP data URL은 입력 순서의
편집 가능한 객체가 되며 한 번에 Undo합니다. 배치는 간격을 둔 세로 흐름이며 넘치는 높이를
함께 축소합니다. HTML 서식·원래 CSS 배치는 재현하지 않습니다.

Composer는 내부 Rich Text 구조화 MIME을 먼저 기존 binding에 위임합니다. 그 외 파일과
이미지-only HTML은 실제 첨부로 준비하고, 이미지가 없는 HTML은 기존 Rich Text로 처리합니다.
글+이미지 HTML은 inline 의미를 표현할 수 없어 draft를 바꾸지 않고 미지원 오류를 알립니다.

HTML 이미지의 외부·상대·blob·cid URL, 비어 있거나 깨진 source는 일부 내용만 남기는 대신
전체 입력을 거절합니다. 임의 다운로드는 하지 않습니다. native 파일과 HTML이 함께 있을 때는
파일 표현이 우선하며, 둘의 대응과 혼합 의미 보존은 TBD입니다. 이 지원 범위는 브라우저·
Docs/Slides의 실제 복사 입력을 모두 지원한다는 뜻이 아닙니다.

Canvas는 평면 객체, Composer는 instruction과 첨부 목록을 결과로 만듭니다.
같은 입력을 받아도 Canvas 좌표를 Composer에 넣거나, 첨부 목록을 Rich Text의
inline 이미지처럼 설명하지 않습니다. 서버 업로드, 임의 외부 URL의 가져오기,
Office 전체 레이아웃 재현은 아직 지원하지 않습니다.

## Live Demo

```live-demo
/demo/clipboard
```
