# Typeahead

TBD.

Typeahead는 인쇄 글쇠로 목록·나무에서 이름으로 건너뛰는 손입니다. 한 글자는
그 글자로 시작하는 다음 항목, 빠르게 이어 치면 그 문자열로 시작합니다.

```ts
import { typeaheadAffordance } from "@interactive-os/json-document-affordance";

typeaheadAffordance({
  buffer: "",
  key: "A",
  elapsedMs: 0,
  names: ["Apple", "Apricot", "Pear"],
  from: "Pear",
});
// { buffer: "A", name: "Apple" }

typeaheadAffordance({
  buffer: "A",
  key: "p",
  elapsedMs: 80,
  names: ["Apple", "Apricot", "Pear"],
  from: "Apple",
});
// { buffer: "Ap", name: "Apple" }

typeaheadAffordance({
  buffer: "Ap",
  key: "x",
  elapsedMs: 1200,
  names: ["Apple", "Apricot", "Pear"],
  from: "Apple",
});
// { buffer: "x", name: null }
```

호스트는 보이는 이름을 줍니다. 어포던스는 버퍼 창과 점프 규칙을 닫습니다.

닫는 손:
- 한 문자: 그 prefix의 다음 항목
- 연속 문자: 문자열 prefix
- 짧은 시간 안에만 이어 붙임

근거: [APG Listbox type-ahead](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/)
