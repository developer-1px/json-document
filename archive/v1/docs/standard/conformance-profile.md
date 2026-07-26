# json-document 1.0 Conformance Profile

상태: 1.0 정식화 기준.

이 문서는 `@interactive-os/json-document` 1.0 호환성을 무엇으로 검증할지
정의한다. 목표는 새 public API를 만드는 것이 아니라, 이미 고정된 public API
계약을 외부 구현체와 유지보수자가 같은 기준으로 읽게 만드는 것이다.

1.0의 conformance profile은 문서화된 profile이다. 별도 npm package, CLI runner,
외부 구현체용 harness는 1.0 범위에 포함하지 않는다. 그런 artifact는 나중에 만들
수 있지만, 1.0 core API 안정화의 선행 조건은 아니다.

## 규범

`MUST`, `MUST NOT`, `SHOULD`, `SHOULD NOT`, `MAY`는 규범 키워드다.

`json-document compatible`을 주장하는 구현체는 public package entrypoint만으로
이 profile의 의미론을 만족해야 한다. 구현체는 consumer에게 source path,
private module, test helper, dist 내부 파일 import를 요구하면 안 된다.

## Profile Class

| Profile | 대상 entrypoint | 의미 |
| --- | --- | --- |
| Core | `@interactive-os/json-document` | headless document foundation 표면 |
| React | `@interactive-os/json-document/react` | 같은 document 표면을 React hook으로 노출 |

React profile은 선택적이다. Core profile을 통과하지 못한 구현체는 React profile을
주장할 수 없다.

## 1.0 Profile Artifact

1.0 conformance는 다음 artifact 묶음으로 정의한다.

| Artifact | 역할 |
| --- | --- |
| `docs/standard/core-standard.md` | public semantics의 규범 기준 |
| `docs/standard/result-contract.md` | result shape, stable error code, diagnostic 기준 |
| `docs/standard/selection-contract.md` | headless selection snapshot과 patch tracking 기준 |
| `docs/standard/schema-introspection-contract.md` | schema query, `schema-slot`, `document-result` 기준 |
| `packages/json-document/public-contract.json` | public export name lock |
| `packages/json-document/tests/public/signature-contract.test-d.ts` | overload와 call shape lock |
| `packages/json-document/tests/public/semantic-contract.test.ts` | strict 기본값, atomicity, clipboard spread, selection/history round-trip fixture |
| `packages/json-document/tests/public/result-contract.test.ts` | result code와 success result shape fixture |
| `packages/json-document/tests/public/standard-conformance.test.ts` | public entrypoint 기반 broad conformance scenario |
| `packages/json-document/tests/public/json-patch/*` | RFC 6902 JSON Patch 공개 동작 |
| `packages/json-document/tests/public/json-pointer/*` | RFC 6901 JSON Pointer 공개 동작 |
| `packages/json-document/tests/public/jsonpath/*` | JSONPath 검색 공개 동작 |

이 artifact들은 서로 다른 층을 잠근다.

```txt
conformance profile
|-- export lock: 이름이 사라지지 않는다
|-- signature fixture: 호출 모양과 overload가 유지된다
|-- semantic fixture: 1.0 이후 바뀌면 breaking인 예시를 고정한다
|-- result fixture: code와 result shape로 분기할 수 있다
|-- standard conformance: public entrypoint만으로 foundation 흐름을 검증한다
`-- protocol fixtures: JSON Patch, Pointer, JSONPath 의미론을 검증한다
```

## 포함되는 의미론

Core profile은 다음 의미론을 포함해야 한다.

- JSON data boundary와 JSON-serializable public payload.
- JSON Pointer 주소와 JSONPath 검색의 구분.
- RFC 6902 JSON Patch 실행과 실패 atomicity.
- schema validation과 schema introspection.
- `strict: false` 기본값과 `strict: true` throwing boundary.
- `can*` capability purity와 reasoned result.
- document mutation result shape와 stable error code.
- headless selection snapshot, `selectionAfter`, patch tracking.
- document-owned clipboard buffer와 payload-only paste.
- undo/redo history round-trip.
- public root helper의 pure patch behavior.

## 포함하지 않는 것

다음은 1.0 conformance profile의 일부가 아니다.

- 별도 `@interactive-os/json-document-conformance` package.
- 외부 구현체용 CLI runner.
- private source path 또는 implementation-only helper.
- `dist/` 파일 구조.
- demo app, site, browser test, Playwright fixture.
- official extension, lab extension, product recipe의 동작.
- performance budget.
- DOM focus, rendering, keyboard, system clipboard permission, storage backend.

Extension은 core profile 위에서 compose되어야 하지만, extension test를 통과했다고
core compatible을 주장할 수는 없다. 반대로 core profile이 extension public API를
자동으로 고정하지도 않는다.

## 실행 기준

이 repo의 1.0 release gate는 다음 명령을 통해 profile과 관련 artifact를 검증한다.

```sh
npm run standard:check
npm run docs:evaluate
npm test -w @interactive-os/json-document -- semantic-contract result-contract standard-conformance
npm run typecheck -w @interactive-os/json-document
```

`npm run standard:check`는 표준 문서, conformance scenario, semantic fixture,
signature fixture, public export lock이 서로 분리되지 않았는지 확인한다.

## 변경 기준

다음 변경은 conformance profile 관점에서 breaking change다.

- public export 제거 또는 rename.
- public overload와 call shape 변경.
- 기존 stable error code 제거, rename, 의미 변경.
- success result shape 의미 변경.
- failed mutation이 state, selection, clipboard, history, subscriber를 부분 변경하게 됨.
- `schema-slot`과 `document-result` violation path 기준 변경.
- `selectionAfter`보다 auto tracking을 우선하도록 변경.
- payload-only core clipboard/paste 의미론 변경.

다음 변경은 별도 검토 후 minor일 수 있다.

- 새 optional result diagnostic field.
- 새 error code 추가.
- 새 `SchemaKind` 추가.
- 새 conformance scenario 추가.

## 보류된 artifact

별도 conformance package나 runner는 보류한다. 보류 이유는 다음이다.

- 1.0에서 public API surface를 더 늘리지 않는다.
- 현재 목표는 외부 구현체 지원 tooling보다 public contract freeze다.
- profile이 문서와 fixture로 충분히 안정된 뒤에야 runner API도 안정적으로 설계할 수 있다.

추후 runner를 만든다면 이 문서의 profile을 source of truth로 삼아야 하며,
runner가 새로운 의미론 계약을 추가하면 안 된다.
