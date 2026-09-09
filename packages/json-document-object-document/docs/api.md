## Object Document Type 계약 · RC

소유자는 `@interactive-os/json-document-object-document`입니다. Object의 값과
의미를 정의하며 선택·ID 할당·Intent·History는 Editing이, 사람의 조작은 Canvas
Hand가 소유합니다. 기존 Editing 타입 export는 같은 정본 타입의 호환 경로입니다.

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
| text | 양의 유한수 fontSize | label이 실제 내용인 plain text. 별도의 text 복사본 없음 |
| rectangle | 없음 | color로 채운 사각형 |
| ellipse | 없음 | 경계 상자에 내접하는 타원 |
| path | points, 양의 유한수 strokeWidth | color로 그린 열린 선 |

path points는 최소 두 개의 `{ x, y }`이며 각 좌표는 `[0, 1]`입니다. 경계 상자에
대한 정규화 좌표이므로 이동·resize는 상자만 바꾸고 점과 strokeWidth를 보존합니다.
`createCanvasPath`는 슬라이드 좌표의 점을 이 표현으로 변환합니다. 수평·수직 선의
퇴화한 축은 최소 1 단위의 상자로 표현합니다. `createCanvasObject`는 도형/글자 초안을
만들며 ID는 Editing의 `object.create`에서 할당합니다.

### 검증과 직렬화

`assertObjectDocument`/`assertCanvasDocument`는 구조 위반 시 TypeError를 던집니다.
`parseCanvasDocument`는 JSON과 프로파일을 검증한 독립된 immutable 값을 반환하고,
`serializeCanvasDocument`는 같은 검증 후 JSON 문자열을 반환합니다. 잘못된 root,
중복 ID, 알 수 없는 kind/profile, 잘못된 수치나 path를 조용히 보정하지 않습니다.
일반 JSON 확장 필드는 보존합니다. tool·selection·focus·preview·history는 프로파일
필드가 아니며 Hand가 문서에 넣지 않습니다.

### 의미 연산과 projection

`planObjectOperation(document, operation)`은 insert, transform, fill, remove,
text, replace를 검증된 JSON Patch로 계획합니다. 성공은 `{ ok: true, operations }`,
실패는 `{ ok: false, code, reason? }`입니다. 계획은 입력을 변경하거나 commit하지
않으며 선택과 History를 알지 못합니다. 없는 대상·중복 ID·유효하지 않은 결과는
전체 거절합니다. no-op는 빈 operations를 반환합니다.

`transformObject`는 preview와 commit의 같은 기하 규칙입니다. translate는 크기를
유지하고 resize는 결과 크기를 최소 1로 제한합니다. Canvas Hand는 현재 모서리가
반대쪽을 통과해도 뒤집지 않습니다. 화면 바깥 좌표는 허용하며 Hand가 슬라이드 밖을
clip합니다. 위치를 자동 보정하거나 snap하지 않습니다.

### Usage와 남은 범위

[Canvas Hand의 실제 Usage/Source](/docs/api/canvas)와 [Object Editing](/docs/object)가
정본을 소비합니다. [Object 소유권 감사](/docs/document-types/object)는 영향을 받는
모델·연산·Editing·Hand·두 Canvas Host의 소유자를 기록합니다.

페이지·줌·팬·그룹·회전·정렬·snap·레이어 패널·PPTX·협업은 이
Canvas slice 범위 밖입니다. 이 RC 프로파일은 독립 구현 간 Stable wire conformance를
선언하지 않습니다. Annotation의 source/selector/body 모델도 Canvas에 통합하지 않습니다.
