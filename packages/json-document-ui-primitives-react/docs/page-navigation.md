# 페이지와 탐색

페이지 식별, 계층 탐색과 현재 위치는 UI Primitives가 소유합니다. Host는 경로,
문구, 실제 데이터와 라우터 연결을 제공합니다. 사이트에서 외형을 다시 구현하지 않습니다.

## PageHeader

`PageHeaderProps`는 `title`, `description?`, `identifier?`, `status?`, `actions?`,
`artwork?`, `level?: 1 | 2`, `titleRole?: "primary" | "section"`을 받습니다.
primary는 기존 40px 콘텐츠 제목, section은 기존 20px 제목입니다. level은 HTML
제목 수준이며 크기와 별개입니다. artwork는 선택적인 장식 자산 슬롯입니다.
고양이 이미지의 선택은 사이트가, 제목과 겹치지 않는 배치는 PageHeader가 소유합니다.

## SidebarNavigation

`groups: readonly NavigationGroup[]`, `label`, `currentId?`, `onNavigate?`,
`renderLink?`, `collapsed?: boolean`을 받습니다. collapsed는 아이콘 rail을 표시하고
탐색 이름은 접근성 트리에 보존합니다. `NavigationItem`은 `id`, `label: ReactNode`, `href`,
`count?`, `icon?`, `children?`입니다. `NavigationGroup`은 `id`, `label?`, `icon?`,
`items`, `expanded?`, `onExpandedChange?`입니다. onExpandedChange가 있는 그룹만
접기·펼치기를 제공합니다. 그룹 label과 목록은 8px, 그룹 사이는 16px입니다.

`NavigationLinkRenderer`는 `(item, attributes: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">)`
형태이며 ReactNode를 반환합니다. 라우터 통합은 전달된 children·aria-current·onClick을
보존해야 합니다. href 링크는 새 탭·수정 키 동작을 유지하며, onNavigate는 수정 키 없는
주 버튼 클릭에만 적용됩니다. 현재 항목, 상위 가지, 계층 들여쓰기와 focus 표현은 정본입니다.

## Breadcrumbs와 링크

`Breadcrumbs`는 `items: readonly BreadcrumbItem[]`, `label?`, `renderLink?`, `collapsed?: boolean`을 받습니다. collapsed는 아이콘 rail을 표시하고
탐색 이름은 접근성 트리에 보존합니다.
각 항목은 `id`, `label`, `href`이며 마지막 항목은 aria-current를 가진 읽기 텍스트입니다.
구분 기호와 줄바꿈은 정본이 소유합니다. 사이트는 문서 관계로부터 항목을 계산합니다.

`linkPresentation.inline`은 native/router 링크, `linkPresentation.action`은 페이지
이동을 실행 버튼과 같은 위계로 제시하는 링크에 사용합니다. 링크를 button으로 바꾸지
않으며 크기·focus·경계 규칙은 기존 컨트롤을 공유합니다.

## 실제 Usage와 Source

- [사이트 제목·일러스트 조합](../../../site/src/shared/ui/primitives.tsx)
- [사이트 계층 탐색과 라우터 연결](../../../site/src/app/routes/__root.tsx)
- [사이트 Breadcrumbs](../../../site/src/app/breadcrumb.tsx)
- [카탈로그의 데이터 의미 탐색](../../../site/src/routes/ui-primitives-catalog/DataPresentationSpecimen.tsx)
- [정본 구현](../src/page-navigation.tsx)

라이브 Usage: `/demo/ui-primitives#design-system-data-presentation`.
사이트 셸 자체가 실제 Usage입니다. `/connectors/react-hook-form`의 기존 Source 탭에서
페이지 조합 → site PageHeader의 자산 주입 → 이 패키지의 정본 구현을 추적할 수 있습니다.
카탈로그 페이지는 별도의 Source 프레임을 덧붙이지 않습니다.
