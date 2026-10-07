# 빠른 시작

JSON Document는 값을 읽고 JSON Patch로 변경하는 공통 계약입니다.
Core부터 사용하고, 편집 UI와 플랫폼 연결은 필요한 모듈을 추가합니다.

## 설치

```sh
npm install @interactive-os/json-document
```

## 값 변경과 구독

```ts
import { createJSONDocument } from "@interactive-os/json-document";

const document = createJSONDocument({ title: "첫 문서" });
const unsubscribe = document.subscribe(() => {
  console.log(document.value);
});

document.commit([{ op: "replace", path: "/title", value: "수정한 문서" }]);
console.log(document.at("/title"));
unsubscribe();
```

읽기·검증·변경·구독의 세부 계약은 [JSON Document](api.md),
공개 symbol은 [Core API](../../packages/json-document/docs/api-reference.md)에서 확인합니다.

## 직접 실행하기

아래 Usage에서 값을 바꾸고 Source 탭에서 정본 구현을 확인하세요.

```live-demo
/demo
```

## 다음 선택

- 입력·선택·실행 취소를 붙이려면 [Editing](editing.md)을 봅니다.
- React나 스키마 라이브러리를 연결하려면 [Connector](connectors.md)를 봅니다.
- 장르별 편집 경험은 [Hands](hands.md), 제품 조합은 [Applications](applications.md)에서 확인합니다.
- 전체 책임은 [모듈](modules.md), 관계와 경계는 [Architecture](architecture.md)에서 찾습니다.
