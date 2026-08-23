# Connectors

Connector는 제품에서 이미 사용하는 라이브러리의 입출력을 JSON Document와
Editing의 공개 계약에 연결합니다. 대상 라이브러리를 교체해도 문서와 편집
계약은 바뀌지 않습니다.

## 공식 Connector

| 라이브러리 | package | 문서 |
| --- | --- | --- |
| React | `@interactive-os/json-document-react` | [React](connector-react.md) |
| React Hook Form | `@interactive-os/json-document-react-hook-form` | [React Hook Form](connector-react-hook-form.md) |
| Ajv | `@interactive-os/json-document-ajv` | [Ajv](connector-ajv.md) |
| Zod | `@interactive-os/json-document-zod` | [Zod](connector-zod.md) |
| TanStack Table | `@interactive-os/json-document-tanstack-table` | [TanStack Table](connector-tanstack-table.md) |

각 Connector 문서는 연결 계약과 Live Demo를 함께 둡니다. keyboard,
clipboard, contenteditable 같은 플랫폼 계약은 [Adapter](adapters.md)가
맡습니다.
