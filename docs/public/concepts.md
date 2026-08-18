# Concepts

Quickstart에서는 JSON을 읽고, 변경을 적용하고, 결과를 구독했습니다. 실제
편집기에서는 여기에 사용자가 고른 위치와 복사한 내용, 되돌릴 변경이
필요합니다. 브라우저 플랫폼과 스키마 도구를 붙이는 일도 남아 있습니다.

json-document를 제품에 연결하는 흐름은 이렇게 이어집니다. 먼저 JSON
Document가 값을 다루고, Editing이 사용자의 편집 상태를 더합니다.
Adapter는 브라우저 플랫폼 계약을 붙이고, Connector는 라이브러리 생태계를
연결합니다.

```txt
JSON Document  →  Editing  →  Adapter  →  Connector  →  제품 화면
값과 변경         선택과 작업    플랫폼 계약    라이브러리      렌더링과 입력
```

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

Editing을 시작할 때 현재 JSON으로 editor를 만듭니다. 화면은 클릭이나 키
입력을 사용자의 요청인 Intent로 바꾸고 `editor.dispatch`에 넘깁니다. editor는
현재 문서와 편집 상태를 읽어 요청을 처리하고 결과를 돌려줍니다.

사용자가 블록이나 셀을 고르는 Intent를 보내면 editor는 현재 대상을
Selection에 기억합니다. Selection은 JSON 옆에 있으므로 위치를 옮기는
것만으로는 문서 변경이나 실행 취소 기록이 생기지 않습니다.

Shift 키로 범위를 늘리거나 표의 여러 셀을 복사하려면 화면에 보이는 순서도
알아야 합니다. 정렬과 필터를 거친 행·열의 순서를 나타내는 값이
Topology입니다. Selection과 복사 기능은 같은 Topology를 읽어 같은 범위를
사용합니다.

선택한 내용을 다른 위치로 옮기려면 JSON과 사람이 읽을 수 있는 텍스트를
함께 보관합니다. 이 구조화된 값이 Clipboard payload입니다. 복사는 payload만
만들고, 잘라내기와 붙여넣기는 문서에 변경을 적용합니다.

문서 값이 바뀌면 Editing은 적용된 patch와 그때의 Selection을 기록합니다.
History는 이 기록을 사용해 값과 선택을 함께 되돌리거나 다시 적용합니다.

## Adapter가 플랫폼을 붙인다

Editing까지 조합하면 화면과 독립된 편집 동작이 완성됩니다. 브라우저에서
쓰려면 키보드, clipboard, contenteditable 같은 플랫폼 계약을 붙여야
합니다.

Adapter는 이런 플랫폼 계약을 json-document의 공개 API에 맞게 변환합니다.
Keyboard adapter는 키 chord를 의미 command로 바꾸고, Clipboard adapter는
복사와 붙여넣기를 Editing의 copy, cut, paste에 연결합니다.

필요한 Adapter만 골라 기존 편집 동작과 조합할 수 있습니다.

## Connector가 외부 도구를 연결한다

제품에서는 같은 편집 동작을 React로 렌더링하거나 Zod와 Ajv로 값을 검사할
수 있습니다.

Connector는 이름 있는 라이브러리 생태계의 입력과 출력을 json-document의
공개 API에 맞게 번역합니다. 예를 들어 React Connector는 document 변경을
React의 구독 방식으로 전달합니다. TanStack Table Connector는 화면에
보이는 행과 열을 Sheet의 Topology로 바꿉니다.

필요한 Connector만 골라 기존 도구와 조합할 수 있습니다.

이제 Editing의 각 개념을 실제 입력과 결과로 연결합니다.

- [Intent guide](intent-guide.md): editor를 만들고 요청을 보내는 진입점
- [Selection](selection.md): 편집 대상과 선택 상태
- [Topology](topology.md): 화면에 보이는 순서와 범위
- [Clipboard](clipboard.md): 선택한 데이터의 복사, 잘라내기와 붙여넣기
- [History](history.md): 값과 선택을 함께 되돌리는 기록
- [Adapters](adapters.md): 키보드, clipboard, contenteditable 플랫폼 변환
- [Connectors](connectors.md): React, Zod, TanStack Table 같은 라이브러리 연결
- [React editing](react-editing.md): 선택 범위와 커서를 React 질의로 그리기

같은 공책을 여러 참여자가 쓰려면 [Collaboration](collaboration.md)으로
갑니다. 모델을 모아 만든 숙제는 [Editors](editors.md)에서 고릅니다.
