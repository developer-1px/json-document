# 제품에서 정본 모듈을 발견하는 방법

json-document는 추상 계층을 먼저 완성한 뒤 제품에 적용하지 않습니다. Calendar나
AI Agent 같은 Application을 먼저 만들고, 실제 사용 흐름에서 반복되는 책임을
발견해 canonical module로 추출합니다. 제품은 추출된 공개 API를 다시 소비하며
경계를 검증합니다.

```text
Application을 만든다
        ↓
실제 제품 사건과 반복 책임을 관찰한다
        ↓
Document Type · Editing · Adapter · UI 책임을 분리한다
        ↓
canonical module과 public API로 정본화한다
        ↓
Application이 정본 API를 다시 소비한다
```

읽기 순서와 책임을 발견하는 방향을 구별합니다.

```text
읽기 순서: Foundation → Building Blocks → Hands → Artifact → Application
책임 발견: Application → 책임 발견 → Canonical Module → Application
```

이 읽기 순서는 package의 직렬 의존 관계가 아닙니다. Adapter와 Connector는
독립적으로 선택하고, Collaboration은 같은 JSONDocument 계약을 구현합니다.

여기서 Artifact는 독립 App이 아니라 Application이 만들고 편집하는 콘텐츠입니다.
Navigation, workflow, runtime과 제품 정책은 Application에 남습니다.

## Application에 남는 것

Application은 화면의 주요 영역과 실행 순서, URL과 navigation, 제품 copy,
permission, fixture, concrete runtime 연결을 소유합니다. 제품 전체를 제거했을 때
함께 사라지는 정책입니다.

## 모듈로 추출하는 것

문서의 의미와 유효성, selection과 history, 입력 번역, 반복되는 UI 동작처럼
제품 밖에서도 같은 역할과 책임을 갖는 코드는 canonical owner로 이동합니다.
한 Application에서만 발견됐더라도 독립적인 책임이면 이름과 경계를 갖습니다.

## 다시 제품으로 돌아오기

추출은 복사본을 하나 더 만드는 일이 아닙니다. Application의 임시 구현을 제거하고
canonical public API를 소비해야 순환이 닫힙니다. [Applications](/applications)는
각 제품에 남은 정책과 추출된 책임을 함께 보여 줍니다.

## 문서에 반영하기

[Architecture](/docs/architecture)는 현재 공개 모듈을 책임별로 연결합니다.
모듈의 역할, 실제 소스 디렉터리, Usage와 확인된 소비 제품은 사이트 등록에 남깁니다.
개요·API의 관계 안내와 Usage의 Source 링크는 같은 등록을 사용합니다.
복수 책임 패키지는 관련 위치에 함께 나타내며, 목표 위치만 정한 상태를 소유권
이전 완료로 표시하지 않습니다. 새 모듈은 등록·문서·실제 소비 증거를 함께 추가합니다.
