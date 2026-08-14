# Collaborative Contenteditable Adapter

Collaborative Text는 DOM을 소유하지 않습니다. Browser의 native input과 IME를
한 contenteditable root에 연결해야 할 때 이 Adapter가 model과 DOM 사이의
경계를 번역합니다.

## 설치하기

```sh
npm install @interactive-os/json-document-collaboration \
  @interactive-os/json-document-contenteditable-collaboration
```

## DOM root 연결하기

```ts
import {
  createContentEditableAdapter,
} from "@interactive-os/json-document-contenteditable-collaboration";

const adapter = createContentEditableAdapter({
  runtime,
  pointer: "/title",
  root,
});

const unbind = adapter.bind();
```

Native-input DOM lease 동안 collaboration ingestion과 document model은 계속
갱신되고, browser가 소유한 root로의 rendering만 잠시 유예됩니다.

## 책임 경계

이 Adapter는 Collaborative Text의 capture, plan, commit을 DOM input lifecycle에
맞춰 호출합니다. Transport, authentication, presence, rich-text schema와 React
rendering은 Product Host가 조립합니다.

공식 Connector catalog의 local React Contenteditable Connector는 local
`JSONDocument`를 React root에 연결합니다. Collaborative Contenteditable
Adapter는 Collaborative Text와 DOM root 사이만 번역하므로 Connector와 다른
개념 및 문서 섹션에 둡니다.
