# 문서 URL 정책 API

`@interactive-os/json-document-url`은 DOM과 프레임워크에 의존하지 않는 문서 URL 값의 허용 판정 모듈입니다. 문서 타입과 표현 대상이 정책을 제공하고 이 모듈이 scheme·상대 참조·제어문자를 판정합니다.

`resolveDocumentURL(value: string | null | undefined, policy: DocumentURLPolicy): string | undefined`

허용하면 입력 문자열 그대로, 거절하면 `undefined`를 반환합니다. URL 파싱·정규화·네트워크 요청·HTML sanitization을 수행하지 않습니다. 정책 필드는 모두 명시합니다.

| 필드 | 의미 |
| --- | --- |
| `schemes` | 허용 scheme 목록. 대소문자 구분 없이 비교 |
| `relative: "any"` | scheme 없는 모든 참조 허용 |
| `relative: "explicit"` | `/`, `./`, `../`, `#`, `?`로 시작하는 참조만 허용 |
| `controlCharacters: "reject"` | C0·DEL을 포함하면 거절 |
| `controlCharacters: "ignore-for-scheme"` | 판정할 때 C0·공백·DEL을 제거하되 반환 원문은 보존 |

빈 문자열·null·undefined는 항상 거절합니다. `//host`는 상대 참조 정책으로 판단합니다. 이 계약은 주소의 도달 가능성이나 신뢰성을 판정하지 않습니다.

```ts
import { resolveDocumentURL } from "@interactive-os/json-document-url";
const href = resolveDocumentURL("../notes", {
  schemes: ["http", "https", "mailto", "tel"],
  relative: "explicit",
  controlCharacters: "reject",
});
```

Markdown Web은 링크와 이미지의 허용 scheme을 구분하고 일반 상대 참조를 보존합니다. Rich Text의 `resolveRichTextLinkURL`은 명시적 상대 참조와 제어문자 거절 정책을 소유하며 renderer와 clipboard가 함께 소비합니다.

[Usage](/demo/document-url)에서 정책별 결과와 정본 구현을 확인할 수 있습니다.
