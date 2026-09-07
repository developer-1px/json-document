# A2UI Connector

`@interactive-os/json-document-a2ui`는 A2UI v0.9 계열의 메시지와 JSONL을 JSONDocument로 연결하는 선택적 Connector입니다. Core의 six-member 계약에는 A2UI나 RxJS 의존성을 추가하지 않습니다.

## Usage

```live-demo
/connectors/a2ui
```

## 책임과 수명

Connector는 SDK envelope 검증, JSONL buffer, 메시지→JSON Patch와 문서 관찰을 소유합니다. Host는 catalog ID, component 정책, 초기 data model과 UI 렌더링을 결정합니다. `initialDataModel`은 기본 `{}`이며 `validateComponent(component, surface)`가 던지면 전체 component 메시지가 거절됩니다.

`document$`는 현재 snapshot을 즉시 제공하고 engine dispatch와 직접 document commit 모두를 관찰합니다. `message$`는 성공한 메시지만 발행하며 문서를 바꾸지 않는 유효 메시지도 포함합니다. 변경 snapshot은 해당 message 알림보다 먼저 도착합니다.

`complete()`는 마지막 줄을 flush하며 다음 스트림을 계속 받을 수 있습니다. `dispose()`는 buffer와 document 구독을 해제하고 두 Observable을 완료합니다. 이후 engine 입력은 `a2ui.disposed` 오류를 던집니다. 노출된 JSONDocument 자체의 수명은 끝내지 않습니다.

오류는 호출자에게 동기적으로 전달됩니다. 메시지 단위 commit은 원자적이지만 chunk 전체는 transaction이 아닙니다. 실패 전 수락한 줄은 유지되고, 같은 chunk에서 실패한 줄 뒤의 완성된 줄은 버려집니다. chunk의 불완전한 마지막 줄은 다음 write를 기다립니다. complete가 실패한 마지막 줄은 다시 재생하지 않습니다.

외부 JSONDocument commit을 사용할 때는 `{ surfaces: { [id]: { catalogId, components, dataModel } } }` 모양을 유지해야 합니다. 알 수 없는 catalog를 렌더링하거나 허용할지는 Host 정책입니다. Connector는 자체 catalog·React renderer·AG-UI runtime을 제공하지 않습니다.

## Reference

[전체 public API](../api-reference/a2ui.md) · [패키지 README](../../packages/json-document-a2ui/README.md)
