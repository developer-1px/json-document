## Rich Text 링크 URL 계약

`resolveRichTextLinkURL(value: string | null | undefined): string | undefined`는 renderer와 clipboard import/export가 함께 사용하는 링크 값 계약입니다.
허용하면 원문을 그대로 반환하고, 거절하면 `undefined`를 반환합니다. `http`, `https`, `mailto`, `tel`과 `/`, `./`, `../`, `#`, `?`로 시작하는 상대 참조를 허용합니다. C0·DEL이 포함된 값과 일반 상대 경로 `notes/page`는 기존 동작대로 거절합니다.

판정 알고리즘은 `@interactive-os/json-document-url`의 공개 `resolveDocumentURL`을 사용합니다. 이 모듈은 Rich Text 링크의 정책 값만 소유합니다. renderer는 거절된 링크의 텍스트를 유지하며 진단을 내고, clipboard는 링크 의미를 제외합니다.

[정본 URL API](/docs/api/document-url) · [Usage](/demo/document-url)
