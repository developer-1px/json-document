## Object Document Type 계약 · RC

소유자는 `@interactive-os/json-document-object-document`입니다. Object의 값과
의미를 정의하며 선택·ID 할당·Intent·History는 Editing이, 조작 문법은 Affordance가,
입력 연결·렌더링은 Canvas Hand가 소유합니다. 기존 Editing 타입 export는 같은 정본 타입의 호환 경로입니다.

### 모델과 Canvas 프로파일

`ObjectDocument.objects`는 뒤에 있는 객체가 위에 그려지는 ordered collection입니다.
`DocumentObject`의 id는 고유한 비어 있지 않은 문자열, label과 color는 문자열,
x/y/width/height는 유한수이며 width/height는 음수가 아닙니다. 예전처럼 kind가 없는
Object도 계속 유효합니다. legacy Object의 생략된 color는 계속 수용하지만 잘못된
타입은 거절합니다. 이 호환성 때문에 `assertObjectDocument`는 필수 필드 충족을
주장하는 TypeScript type guard가 아닙니다. Canvas에서는 color가 필수입니다.
`projectObject`는 legacy Object를 rectangle으로 읽으며 저장값을 바꾸지 않습니다.

`CanvasDocument`는 같은 모델에 `profile: "canvas/1"`, 양의 유한수 width/height와
명시적인 kind를 추가한 단일 슬라이드 프로파일입니다. 같은 책임의 두 번째 객체
모델이 아닙니다. 객체 크기도 양수여야 합니다.

| kind | 추가 문서 값 | 표현 |
| --- | --- | --- |
| text | 양의 유한수 fontSize, 선택적 fontWeight·textAlign | label이 실제 내용인 plain text. 별도의 text 복사본 없음 |
| rectangle | 선택적 strokeColor·strokeWidth | color로 채운 사각형 |
| ellipse | 선택적 strokeColor·strokeWidth | 경계 상자에 내접하는 타원 |
| path | points, 양의 유한수 strokeWidth | color로 그린 열린 선 |
| image | source | 문서에 포함한 PNG/JPEG/WebP의 base64 data URL |

path points는 최소 두 개의 `{ x, y }`이며 각 좌표는 `[0, 1]`입니다. 경계 상자에
대한 정규화 좌표이므로 이동·resize는 상자만 바꾸고 점과 strokeWidth를 보존합니다.
`createCanvasPath`는 슬라이드 좌표의 점을 이 표현으로 변환합니다. 수평·수직 선의
퇴화한 축은 최소 1 단위의 상자로 표현합니다. `createCanvasObject`는 도형/글자 초안을
만들며 ID는 Editing의 `object.create`에서 할당합니다.

`createCanvasImage({ source, width, height, label }, bounds)`는 decode된 자연 크기를
주어진 상자에 비율을 유지해 맞추며 확대하지 않습니다. image의 color는 공통 모델 호환을
위한 `transparent`이고 렌더링에는 쓰지 않습니다. 이후 resize는 다른 객체와 같은 자유
상자 변환이며 원본 비율을 강제하지 않습니다. source 바이트는 이동·resize·복제에 유지됩니다.

`assertCanvasImageSource`는 PNG/JPEG/WebP MIME과 비어 있지 않은 base64 문법을 검증합니다.
외부 URL, blob URL, SVG, HTML은 거절합니다. 실제 이미지 decode나 파일 크기·픽셀 정책 검사는
하지 않습니다. Web의 `readWebRasterFile`과 File Intake를 거친 입력만 실제 이미지로 수용하는
경계는 Canvas Clipboard binding에 있습니다. JSON 문자열만으로 디코딩 가능성을 보증하지 않습니다.

### 검증과 직렬화

`assertObjectDocument`/`assertCanvasDocument`는 구조 위반 시 TypeError를 던집니다.
`parseCanvasDocument`는 JSON과 프로파일을 검증한 독립된 immutable 값을 반환하고,
`serializeCanvasDocument`는 같은 검증 후 JSON 문자열을 반환합니다. 잘못된 root,
중복 ID, 알 수 없는 kind/profile, 잘못된 수치나 path를 조용히 보정하지 않습니다.
일반 JSON 확장 필드는 보존합니다. tool·selection·focus·preview·history는 프로파일
필드가 아니며 Hand가 문서에 넣지 않습니다.

### 의미 연산과 projection

`planObjectOperation(document, operation)`은 insert, transform, fill, style, remove,
text, replace를 검증된 JSON Patch로 계획합니다. 성공은 `{ ok: true, operations }`,
실패는 `{ ok: false, code, reason? }`입니다. 계획은 입력을 변경하거나 commit하지
않으며 선택과 History를 알지 못합니다. 없는 대상·중복 ID·유효하지 않은 결과는
전체 거절합니다. no-op는 빈 operations를 반환합니다.

`transformObject`는 preview와 commit의 같은 기하 규칙입니다. translate는 크기를
유지하고 resize는 결과 크기를 최소 1로 제한합니다. Canvas Hand는 현재 모서리가
반대쪽을 통과해도 뒤집지 않습니다. 화면 바깥 좌표는 허용하며 Hand가 슬라이드 밖을
clip합니다. 위치를 자동 보정하거나 snap하지 않습니다.

### 객체 스타일

`getObjectStyle(object)`는 적용 가능한 속성의 유효값을 반환합니다. 글자의 생략된
`fontWeight`는 400, `textAlign`은 `left`입니다. 굵기는 400/700, 정렬은
`left`/`center`/`right`를 지원합니다. 도형의 생략된 `strokeColor`는 `#000000`,
`strokeWidth`는 0이므로 기존 문서는 테두리 없이 그대로 열립니다. 기본값을 읽는 것만으로
문서를 바꾸지 않으며, 기존 kind 없는 Object는 color만 지원합니다.

`ObjectStyle`의 color는 도형의 채우기·글자색·path의 선 색입니다. strokeColor는
사각형·타원의 테두리색이며 strokeWidth는 도형과 path의 선 굵기입니다. 이미지에는
스타일 속성이 없습니다. 새 스타일의 색 값은 비어 있지 않은 문자열이고, 도형의 굵기는
0 이상, path의 굵기와 글자 크기는 양의 유한수여야 합니다. 색 문자열의 CSS 해석은
렌더링 플랫폼의 책임입니다. 부분 문자열 서식이나 Rich Text 모델은 아닙니다.

`readObjectStyle(objects)`는 속성을 지원하는 객체끼리만 비교합니다. 공통 값이면 그 값,
서로 다르면 `null`, 지원하는 객체가 없으면 속성을 생략합니다. `null`은 저장값이 아니라
혼합 선택의 읽기 결과입니다.

```ts
import { readObjectStyle, planObjectOperation } from "@interactive-os/json-document-object-document";

const style = readObjectStyle(document.objects);
const plan = planObjectOperation(document, {
  type: "style", objectIds: ["title", "rectangle"],
  style: { color: "#3b82f6", fontWeight: 700, strokeWidth: 2 },
});
```

`style` 연산은 `Partial<ObjectStyle>`을 받아 지원하는 대상 필드에만 적용합니다.
`assertObjectStyle`로 전체 요청을 먼저 검증하므로 지원하지 않는 속성도 잘못된 값이면
전체 거절합니다. 없는 ID와 잘못된 결과도 전체 거절합니다. 특히 path가 섞인 집합에
strokeWidth 0을 적용하면 도형만 바꾸지 않고 전체를 거절합니다. 같은 유효값, 빈 요청,
지원 대상이 없는 요청은 빈 patch이며 생략된 기본값을 저장하지 않습니다.
기존 `fill`은 이미지의 color 메타데이터를 포함한 기존 동작을 유지하는 호환 명령입니다.

### Usage와 남은 범위

[Canvas Hand의 실제 Usage/Source](/docs/api/canvas)와 [Object Editing](/docs/object)가
정본을 소비합니다. [Object 소유권 감사](/docs/document-types/object)는 영향을 받는
모델·연산·Editing·Hand·두 Canvas Host의 소유자를 기록합니다.

페이지·줌·팬·그룹·회전·정렬·snap·레이어 패널·PPTX·협업은 이
Canvas slice 범위 밖입니다. 이 RC 프로파일은 독립 구현 간 Stable wire conformance를
선언하지 않습니다. Annotation의 source/selector/body 모델도 Canvas에 통합하지 않습니다.
