# UI Recipes v1 Profile

표준 상태: Draft. 이 profile은 제품 화면이 반복해서 쓰는 UI 레시피의 **행동과 해부**를
`@interactive-os/json-document-ui-recipes` 패키지의 타입 있는 데이터와 black-box
conformance vector로 고정한다. 첫 레시피는
Preview popover다.

`MUST`, `MUST NOT`, `SHOULD`, `MAY`는 RFC 2119의 의미로 사용한다.

## 목적과 경계

레시피는 여러 제품이 독립적으로 수렴한 하나의 UI 뷰다(예: 링크 옆에 뜨는 미리보기).
이 profile은 레시피마다 다음을 정한다.

- 이름과 수렴 근거: 같은 뷰를 쓰는 제품 셋 이상과 그 출처
- 해부: 레시피를 이루는 필수·선택 슬롯
- 행동 규칙: 사용자의 작업과 관찰 가능한 결과로 적은 규칙

시각 토큰(색, 타이포그래피, 간격, 모서리, 그림자)은 이 profile의 대상이 아니다.
Host product가 소유한다.

이 profile은 구현을 배포하지 않는다. 규칙은 먼저 Host product 안에서 구현하고, Host가
vector를 자기 화면에 실행해 검증한다. 같은 규칙을 구현한 Host가 둘이 되면 그 행동을
json-document의 Affordance 또는 UI Primitives 모듈로 추출하고, 규칙의 `owner`를 그
모듈로 바꾼다.

```text
@interactive-os/json-document-ui-recipes (recipes, vectors)
        ↓ imported as code
Host product → Host harness runs vectors on its own UI
        ↓ second Host implements the same rule
Affordance / UI Primitives module (owner)
```

## 우선순위

정본의 우선순위는 외부 표준(HTML, WAI-ARIA APG), 이 profile과 레시피 데이터,
conformance vector, Host 구현 순서다. Host 구현의 현재 동작은 상위 계약을 덮어쓸 수
없다. 제품이 다르게 행동해야 하면 같은 변경에서 패키지의 레시피와 vector를 먼저 고친다.

## Normative requirements

| ID | 요구사항 |
| --- | --- |
| UIR1-GOV-001 | Host는 채택한 레시피의 모든 규칙 vector를 자기 UI에 MUST 실행하고, 실패하면 변경을 MUST NOT 병합한다. |
| UIR1-GOV-002 | 레시피의 행동을 바꾸는 변경은 같은 변경에서 레시피의 규칙과 vector를 MUST 갱신한다. |
| UIR1-RECIPE-001 | 레시피는 고유한 `id`, `name`, 그리고 출처 URL이 있는 수렴 근거를 셋 이상 MUST 가진다. |
| UIR1-RECIPE-002 | 레시피는 `anatomy.required`와 `anatomy.optional` 슬롯을 MUST 선언하며 두 목록은 겹치면 안 된다. |
| UIR1-RECIPE-003 | 규칙은 이 표의 ID, 작업과 결과로 쓴 `statement`, `owner`(`host` 또는 json-document 모듈 이름)를 MUST 가진다. |
| UIR1-RECIPE-004 | 규칙마다 그 ID를 `requirements`에 담은 vector case가 하나 이상 MUST 있다. |
| UIR1-RECIPE-005 | 레시피는 시각 토큰 값을 MUST NOT 담는다. |
| UIR1-PV-001 | 기준 요소의 일반 활성화(주 버튼 클릭, Enter)는 미리보기를 MUST 연다. 수정키(⌘·Ctrl·Shift·Alt)나 가운데 버튼 활성화는 미리보기를 열지 않고 기준 요소의 원래 이동을 MUST 따른다. |
| UIR1-PV-002 | 미리보기 패널은 기준 요소 옆에 기준 요소를 가리지 않고 MUST 놓이며 viewport 안에 MUST 들어간다. |
| UIR1-PV-003 | Escape와 패널 바깥 pointer 활성화는 미리보기를 MUST 닫는다. |
| UIR1-PV-004 | 열리면 초점이 패널로 MUST 가고, 닫히면 기준 요소가 아직 문서에 있을 때 초점이 기준 요소로 MUST 돌아온다. |
| UIR1-PV-005 | 미리보기는 한 번에 하나만 MUST 열린다. 다른 내용을 요청하면 열린 미리보기를 그 내용으로 MUST 교체한다. |
| UIR1-PV-006 | 스크롤 위치는 내용마다 MUST 따로 유지된다. 처음 보는 내용은 맨 위에서 시작하고, 다시 연 내용은 마지막으로 읽던 위치로 MUST 돌아온다. 교체(UIR1-PV-005)와 닫았다 다시 열기 모두에 적용된다. |

## 레시피 manifest

각 레시피(`Recipe`)는 다음 필드를 가진다.

| 필드 | 의미 |
| --- | --- |
| `id` | kebab-case 고유 이름 |
| `name` | 생태계에서 통용되는 이름 |
| `evidence[]` | `{ product, url }`, 같은 뷰를 쓰는 제품 |
| `standards[]` | `{ name, url }`, 따르는 외부 표준 |
| `anatomy` | `{ required[], optional[] }`, 슬롯 이름 |
| `rules[]` | `{ id, name, statement, owner }` |
| `variants[]` | `{ id, status, statement }`, 같은 레시피의 후보 변형 |

## Conformance vector

vector는 시작 상태, 작업, 관찰을 DOM과 framework에 중립적인 어휘로 적는다. Host
harness는 이 어휘를 자기 UI에 연결만 하고 레시피 로직을 다시 구현하지 않는다.

`fixture.contents`는 Host가 준비해야 하는 내용이다. `scrollable`은 그 내용의 본문이
최소 그만큼 스크롤될 수 있어야 한다는 뜻이다.

| 작업 `do` | 의미 |
| --- | --- |
| `open` | `content` 기준 요소의 일반 활성화. `modifier`가 있으면 그 키를 누른 채 활성화 |
| `scroll` | 열린 패널 본문을 사용자가 `by` 픽셀 스크롤 |
| `press` | 초점이 있는 곳에서 `key` 입력 |
| `click-outside` | 패널과 기준 요소 바깥의 pointer 활성화 |

| 관찰 `expect` | 의미 |
| --- | --- |
| `open` | 열린 미리보기 수(`count`)와 보이는 내용(`content`) |
| `scrollTop` | 열린 패널 본문의 스크롤 위치(`value`, 허용 오차 2px) |
| `focused` | 초점 위치: `panel` 또는 `anchor` |
| `placement` | `beside-anchor`: 기준 요소와 겹치지 않음, `within-viewport`: viewport 안 |

어휘는 `RecipeAction`·`RecipeObservation` 타입이 고정하고, 패키지 테스트가 profile, 레시피,
vector의 추적성을 검사한다. 행동의 실제
검증은 Host harness가 한다.
