# Concepts

Quickstart에서는 JSON을 읽고, 변경을 적용하고, 결과를 구독했습니다. 실제
편집기에서는 여기에 사용자가 고른 위치와 복사한 내용, 되돌릴 변경이
필요합니다. 화면과 스키마 도구를 연결하는 일도 남아 있습니다.

이 기능은 세 단계로 이어집니다. 먼저 JSON Document가 값을 다루고, Editing이
사용자의 편집 상태를 더합니다. Connector는 그 결과를 React나 브라우저 같은
외부 도구에 연결합니다.

```txt
JSON Document  →  Editing  →  Connector  →  제품 화면
값과 변경         선택과 작업    외부 API 번역    렌더링과 입력
```

오른쪽 패널에서 이 순서를 한 문서 위에서 확인할 수 있습니다. 블록을 고르면
편집 상태만 달라지고, 잘라내면 JSON 값과 실행 취소 기록이 함께 바뀝니다.

## JSON Document가 값을 다룬다

모든 편집은 현재 JSON에서 시작합니다. `JSONDocument`는 값을 읽고, 위치를
찾고, JSON Patch를 검사해 적용합니다. 적용된 변경은 구독자에게 전달합니다.

이 책임을 작게 유지하면 같은 문서를 카드 화면과 표, 저장소가 함께 사용할
수 있습니다. 각 화면은 서로 다른 방식으로 보여 주더라도 변경의 주소와
순서는 같은 형식으로 읽습니다.

문서의 값만으로는 사용자가 어느 블록을 보고 있는지 알 수 없습니다. 블록을
클릭했을 때 JSON을 바꿀 이유도 없습니다. 이처럼 편집하는 동안만 필요한
상태는 다음 단계에서 더합니다.

## Editing이 사용자 작업을 더한다

사용자가 블록이나 셀을 클릭하면 편집기는 현재 대상을 기억합니다. 이 상태가
Selection입니다. Selection은 JSON 옆에 있으므로 위치를 옮기는 것만으로는
문서 변경이나 실행 취소 기록이 생기지 않습니다.

Shift 키로 범위를 늘리거나 표의 여러 셀을 복사하려면 화면에 보이는 순서도
알아야 합니다. 정렬과 필터를 거친 행·열의 순서를 나타내는 값이
Topology입니다. Selection과 복사 기능은 같은 Topology를 읽어 같은 범위를
사용합니다.

선택한 내용을 다른 위치로 옮기려면 JSON과 사람이 읽을 수 있는 텍스트를
함께 보관합니다. 이 구조화된 값이 Clipboard payload입니다. 복사는 payload만
만들고, 잘라내기와 붙여넣기는 문서에 변경을 적용합니다.

문서 값이 바뀌면 Editing은 적용된 patch와 그때의 Selection을 기록합니다.
History는 이 기록을 사용해 값과 선택을 함께 되돌리거나 다시 적용합니다.

각 개념은 다음 문서에서 실제 입력과 결과를 중심으로 이어집니다.

- [Selection](selection.md): 편집 대상과 선택 상태
- [Topology](topology.md): 화면에 보이는 순서와 범위
- [Clipboard](clipboard.md): 선택한 데이터의 복사, 잘라내기와 붙여넣기
- [History](history.md): 값과 선택을 함께 되돌리는 기록

## Connector가 외부 도구를 연결한다

Editing까지 조합하면 headless 편집 동작이 완성됩니다. 제품 화면에서는 이
동작을 React로 렌더링하고, Zod나 Ajv로 값을 검사하고, 브라우저의 clipboard
event로 복사와 붙여넣기를 시작합니다.

Connector는 외부 도구의 입력과 출력을 json-document의 공개 API에 맞게
번역합니다. 예를 들어 React Connector는 document 변경을 React의 구독
방식으로 전달합니다. TanStack Table Connector는 화면에 보이는 행과 열을
Sheet의 Topology로 바꿉니다. Web Connector는 browser clipboard event와
Editing의 copy, cut, paste를 연결합니다.

Connector가 외부 의존성을 맡으면 JSON Document와 Editing의 API는 사용하는
framework나 실행 환경이 달라져도 유지됩니다. 제품은 필요한 Connector만
골라 기존 도구와 조합할 수 있습니다.

먼저 Editing의 출발점인 [Selection](selection.md)에서 사용자가 고른 대상을
어떻게 기억하는지 살펴봅니다.
