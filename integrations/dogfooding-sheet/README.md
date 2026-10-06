# 기존 Sheet 연결분

이 패치는 `developer-1px/dogfooding-sheet`의 로컬 `spredsheet` 작업 상태에 적용한 변경만 담습니다. 시작 HEAD는 `fb31a2e`였지만 411개 미커밋 변경 항목이 있었으므로 HEAD와의 diff가 아니라 작업 시작 시 파일 내용과의 diff입니다. 기존 작업을 별도 커밋하거나 다른 브랜치로 덮어쓰지 않았습니다.

정본 연결:

- `rangeTabTarget` / `rangeEnterTarget` → Selection `traverseGrid`
- `useSheetGrid` 선택 드래그 상태 → Selection `reducePressInteraction`
- `fillTargetForCell` → Affordance `/grid-fill`의 `extendGridFill`
- `resizeRules` → Affordance `/axis-resize`의 크기 제한·키보드·접기/복원

A1 좌표, 보이는 축의 희소 투영, 수식·수열 채우기와 제품 기본 크기는 기존 Sheet에 유지합니다. 의존성 가드는 임의 runtime을 허용하도록 제거하지 않고, 위 정본 package/subpath만 허용합니다.

```sh
node scripts/apply-sheet-sibling-migration.mjs /path/to/spredsheet
# 아직 적용 전이고 모든 baseline SHA가 맞을 때에만:
node scripts/apply-sheet-sibling-migration.mjs /path/to/spredsheet --apply
```

`migration.json`은 변경 전후 SHA-256을 기록합니다. 다른 작업이 겹치거나 일부만 적용된 상태에서는 아무 파일도 변경하지 않습니다. 이 패치를 현재 Git HEAD에 바로 적용하는 것은 지원하지 않습니다. 해당 미커밋 작업을 먼저 포함한 뒤 적용하거나, 그 작업이 정리된 시점에 다시 대조해야 합니다.

이번 json-document revision을 빌드한 Selection/Affordance package가 필요합니다. 로컬 검증에서는 형제 앱의 기존 설치를 보존하고 두 package만 `node_modules/@interactive-os/`에서 이 작업의 빌드로 연결했습니다. 재현 환경은 이 revision의 `npm pack` 결과를 설치하면 됩니다. package manifest의 버전 범위만으로 아직 배포되지 않은 새 export가 설치된다고 가정하지 않습니다. 레거시 의존 경로를 대량 갱신하거나 형제 lockfile 전체를 재생성하지 않았습니다.

검증 명령은 형제 repo root에서 실행합니다:

```sh
./node_modules/.bin/vitest run src/app/previews/keyboard-anchor-preview.test.ts src/widgets/sheet-grid/hooks/useSheetGrid.react.test.ts src/widgets/sheet-grid/model/resizeRules.test.ts src/widgets/sheet-grid/ui/GridHeader.test.ts src/widgets/sheet-grid/ui/RowHeader.test.ts src/features/fill/model/fillDown.test.ts src/features/fill/hooks/useAutoFill.test.ts --maxWorkers=1
```

Grid package 검증은 `packages/grid`를 cwd로 하여 `../../node_modules/.bin/vitest run --config vitest.config.ts`를 실행합니다. root에서 이 config만 지정하면 include 경로가 root에 적용돼 의도치 않게 전체 앱 테스트를 실행하므로 cwd를 구분해야 합니다.
