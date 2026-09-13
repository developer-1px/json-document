# Connectors

Connector는 제품에서 이미 사용하는 라이브러리의 입출력을 JSON Document와
Editing의 공개 계약에 연결합니다. 대상 라이브러리를 교체해도 문서와 편집
계약은 바뀌지 않습니다.

## 외부 생태계와 모듈

위 목록은 실제 패키지 API 등록에서 구성합니다. React와 React Hook Form,
Ajv·Zod·TanStack Table·A2UI뿐 아니라 Rich Text·Markdown·Composer·Mention·
Suggestion의 React 연결도 같은 책임 위치에서 찾습니다.

React라는 이름만으로 Connector가 되지는 않습니다. 표준 control과 overlay는
UI Primitives, 장르별 편집을 닫는 조합은 Hands입니다. 프레임워크의 관찰·수명·
props를 기존 계약에 대응시키는 부분이 Connector입니다.

각 API 문서에서 Usage와 확인된 제품 조합을 찾을 수 있습니다. keyboard,
clipboard, contenteditable 같은 플랫폼 계약은 [Adapter](adapters.md)가 맡습니다.
