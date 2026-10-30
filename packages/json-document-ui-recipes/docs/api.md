# UI Recipes 계약

레시피는 여러 제품이 독립적으로 수렴한 UI 뷰입니다. 이 package는 레시피마다 수렴 근거,
해부(필수·선택 슬롯), 행동 규칙(`UIR1-*`)과 black-box conformance vector를 타입 있는
데이터로 제공합니다. 규칙의 정의는 `standards/ui-recipes-v1/profile.md`가 소유합니다.

행동 구현과 시각 토큰은 담지 않습니다. Host는 vector의 작업(`open`, `scroll`, `press`,
`click-outside`)과 관찰(`open`, `scrollTop`, `focused`, `placement`)을 자기 UI에 연결만 하고
실행합니다. 같은 규칙을 구현한 Host가 둘이 되면 그 행동은 소유 모듈로 추출되고 규칙의
`owner`가 그 모듈로 바뀝니다.

```ts
import {recipeSpec} from "@interactive-os/json-document-ui-recipes";

const spec = recipeSpec("preview-popover");
for (const entry of spec?.vectors.cases ?? []) {
  // entry.steps를 Host UI의 작업과 관찰에 연결해 실행한다
}
```
