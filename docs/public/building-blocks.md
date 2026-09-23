# Building Blocks

Building Blocks는 Foundation의 계약을 실제 입력·외부 생태계·UI에 연결하는
독립적인 책임입니다. 필요한 조각을 골라 Hands를 조합합니다.

## 네 가지 책임

| 위치 | 건너는 경계 | 안내 |
| --- | --- | --- |
| Adapter | keyboard, pointer, clipboard, native input 같은 플랫폼 사실 → 기존 편집 계약 | [Adapter](adapters.md) |
| Connector | React, React Hook Form, Ajv, Zod, TanStack Table, A2UI의 계약 ↔ 문서·편집 계약 | [Connector](connectors.md) |
| Affordance | 선택·drag·resize·취소 같은 조작 의미와 수명주기 → 장르별 Intent | [Affordance](affordance.md) |
| UI Primitives | 표준 control·focus·overlay·반복 UI 행동 → 제품의 시각 조합 | [UI Primitives](ui-primitives.md) |

Adapter와 Connector는 앞뒤 계층이 아닙니다. React 없이 Web Adapter를 쓰거나,
DOM 입력 없이 Connector로 문서를 관찰할 수 있습니다. Affordance가 플랫폼 입력을
받는 편의 API도 실제 플랫폼 판정은 Adapter의 계약을 소비합니다.

## 조합과 소유권

JSON 값과 원자적 변경은 [JSON Document](api.md), 문서 고유 의미는
[Document Type](document-types.md), 작업 경계와 선택·History는
[Editing](editing.md)에 남습니다. Building Blocks는 이 의미를 다시 구현하지 않고
자신이 연결하는 계약을 소비합니다.

Host는 사용할 모듈, 권한·기본값, 구체 인스턴스와 layout을 선택합니다.
modifier 해석, gesture 수명주기, native selection 복구와 재사용 UI는 해당
Adapter·Affordance·Connector·UI Primitives의 책임입니다.

## 현재 제공 범위와 목표

각 안내의 API·Usage·Source는 현재 제공하는 연결을 보여 줍니다. 특정 연결의
존재가 모든 플랫폼이나 모든 장르의 편집을 보장하지는 않습니다.

[Official Hands · TBD](official-hands.md)는 이 조각들을 조합했을 때 지원 입력,
선택 복원, Clipboard, 취소와 Undo/Redo가 함께 동작하는 기본 Profile을 목표로
합니다. 지원 범위와 적합성 증거가 닫히기 전에는 완성된 SDK로 간주하지 않습니다.
