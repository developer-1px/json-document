# Collaborative Text

기본 Collaboration runtime은 string을 하나의 atomic JSON value로 다룹니다.
여러 actor가 같은 문자열을 세밀하게 편집해야 할 때 `/text` profile이 stable
text atom과 text splice를 추가합니다.

## Text runtime 만들기

```ts
import {
  createTextRuntime,
} from "@interactive-os/json-document-collaboration/text";

const runtime = createTextRuntime(
  { title: "Shared title" },
  options,
);
```

일반 editor는 계속 `runtime.document`에 JSON Patch를 commit할 수 있습니다.
String-to-string replace는 text profile에서 collaborative text splice로
authoring됩니다.

## Capture, plan, commit

Native input과 IME는 browser가 DOM을 바꾸기 전에 causal basis를 capture해야
합니다. 최종 DOM observation과 비교해 plan을 만들고, graph가 그대로일 때만
commit합니다.

```ts
const captured = runtime.text.capture("/title");

if (captured.ok) {
  const planned = runtime.text.plan(captured.capture, {
    value: finalDOMText,
    selection: { anchor: 6, focus: 6 },
  });

  if (planned.ok) runtime.text.commit(planned.plan);
}
```

```txt
text capture ──> text plan ──> text commit
 causal basis      splice        Change
```

Capture 뒤 remote bundle이 도착해도 unseen input은 concurrent Change로 남아
stable atom을 기준으로 merge됩니다. Plan 뒤 graph가 바뀌면
`stale_text_plan`으로 실패하고 최신 model을 다시 rendering해야 합니다.

## Contenteditable Adapter 연결하기

`@interactive-os/json-document-contenteditable-collaboration`은 Collaborative
Text와 한 contenteditable root를 연결하는 DOM Adapter입니다. 이는 공식
Connector catalog의 local React Contenteditable Connector와 다른 위치에
있습니다.

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
갱신되고, browser가 소유한 root로의 rendering만 잠시 유예됩니다. Transport,
presence, rich-text schema와 React rendering은 Adapter가 소유하지 않습니다.
