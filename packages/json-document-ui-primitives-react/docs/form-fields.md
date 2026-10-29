# 입력 필드

`FormField`는 한 입력의 보이는 레이블·도움말·오류를 연결하는 정본이다.
입력 종류, 값, 검증 시점과 저장 정책은 해당 값의 소유자가 정한다.
카탈로그 [입력·선택 Usage](/demo/ui-primitives#design-system-controls)에서
필수 값 오류, 수정, 저장, 숫자 입력을 직접 조작할 수 있다.

```tsx
import {Field, FormField} from "@interactive-os/json-document-ui-primitives-react";

<FormField label="팀 이름" required description="사이드바에 표시됩니다." error={error}>
  {control => <Field {...control} label="팀 이름" value={name} onValueChange={setName}/>}
</FormField>
```

`FormFieldProps`는 `label`, 선택적인 `id`, `description`, `error`, `required`,
`children(control)`을 받는다. children은 하나의 입력에 `FormFieldControlProps`의
`id`, `required`, `aria-describedby`, `aria-invalid`를 전달한다. 레이블 클릭은
연결된 입력에 포커스를 준다. description과 error는 동시에 연결할 수 있다.
error가 없을 때는 오류 상태를 만들지 않는다. 여러 입력의 그룹은 이 API로
하나의 입력처럼 표시하지 않고 별도 fieldset의 책임으로 둔다.

`Field`는 단일·여러 줄의 텍스트 값 입력을, `NumberField`는 숫자의 파싱과 범위·정밀도
검증을 소유한다. NumberField의 레이블과 오류 표현도 FormField를 사용한다.
필수 숫자가 비어 있어도 사용자가 조작하기 전에는 오류를 표시하지 않는다.
잘못된 초안은 지우거나 0으로 바꾸지 않으며 올바른 값만 onValueChange로 전달한다.

UI Builder의 input/textarea는 같은 FormField를 소비한다. 기존 detail은 placeholder로
유지하고 `props.description`은 보이는 도움말, `props.required`는 필수 표시와 native
required 속성에 연결한다. 폼 전체의 제출·서버 검증을 대신하는 계약은 아니다.

스타일은 `design-system.css`와 기존 토큰을 사용한다. 입력별 새 곡률·색·간격
변형을 만들지 않는다. [정본 소스](../src/form-field.tsx).
