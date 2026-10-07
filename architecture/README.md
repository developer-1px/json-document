# 아키텍처 등록과 drift

`modules.json`은 실제 패키지의 책임·아키텍처 위치·public source entrypoint·API
문서 소유 위치를 등록한다. URL·메뉴 순서·Usage는 소유하지 않는다. 사이트는
`site/route-registry.mjs`에서 이 등록과 `site/site-routes.json`을 합성한다.
같은 책임을 사이트에서 다시 정의하면 실패한다. API 문서는 owning package의
`docs/api-reference.md`에 생성한다. `docs/api-reference/packages.mjs`는 생성기에
이 등록을 연결하며 별도 책임 목록을 유지하지 않는다.

```text
package.json exports + 실제 TypeScript source
                    │ 대조
                    ▼
        architecture/modules.json
                    │
          ┌─────────┴───────────┐
          ▼                     ▼
packages/*/docs/          사이트 문서·Usage 등록
api-reference.md                │
                      Architecture·메뉴·API 연결
```

## #779 조사와 대응

| 관찰한 drift | 대응 | 남은 한계 |
| --- | --- | --- |
| 책임·위치가 사이트 라우트에 종속 | 저장소 아키텍처 등록으로 이동; 사이트 재정의 금지 | 분류 의미의 타당성은 소유권 감사 대상 |
| 생성 API 본문 35개가 패키지 밖에 위치 | 모든 본문을 owning package docs로 이동 | 수동 계약 설명은 기존 owner docs에서 유지 |
| API 생성기의 source·책임 목록이 별도 존재 | 아키텍처 등록 소비; manifest의 types export와 실제 source 대조 | API 동작은 적합성·단위·브라우저 검사 대상 |
| Application 연결이 유효 URL인지 확인할 뿐 소비 증거 없음 | route source에서 정적 import 경로 추적; 미도달 모듈 거절 | 대표 조합만 검증; 전체 의존성 목록 아님 |
| 소스 표시 import를 API 소비로 오인할 수 있음 | `?raw`·`?url`은 소비 경로에서 제외 | 동적 계산 specifier·runtime 호출은 증명하지 않음 |
| 사이트 경계 검사와 현재 Host·문서 조합이 불일치 | Applications 위치를 명시하고 shared의 app 역참조·카탈로그 중간 라우트를 제거 | 제품의 책임 준수는 별도 소유권 감사 대상 |
| Editing·Rich Text 혼합 책임, Hands·Artifact 미완료 | 기존 statusNote와 Document Type 감사 상태 유지 | 이 변경은 패키지 책임 재배치나 Profile 완료가 아님 |

## 검사

- `npm run check:architecture`: workspace 분모, package 이름·exports/source, API
  소유 위치·사이트 연결, Application의 대표 모듈 도달 경로를 검사한다.
- `npm run check:architecture -- --evidence`: 제품별 등록 연결의 import 경로를 출력한다.
- `npm run test:architecture`: 소유자 누락·잘못된 public source·사이트 재정의·
  잘못된 소비 관계·private subpath·raw 소스의 오인에 대한 회귀 검사다.
- `npm run docs:evaluate`: API 생성물과 위 검사, 문서 링크를 함께 검증한다.
- 사이트 `check:canonical-modules`: 위 검사와 기존 Usage·Source 정본 검사를 실행한다.

정적 그래프에는 type import와 barrel re-export가 포함된다. API의 실제 실행,
사용한 symbol의 최소 집합 또는 번들 크기를 뜻하지 않는다. Application의 목록을
늘릴 때에는 `applicationSource`에서 실제 연결되는지 확인하고 제품 의미를 별도로
검토한다. Document Type 상태의 정본은 기존 `audits/document-types.json`이다.
