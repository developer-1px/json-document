# Canonical module audits

이 폴더는 공개 제품 문서가 아니라 repository 책임 감사를 위한 machine-readable
ledger를 소유합니다. 사이트는 결과를 표시할 수 있지만 감사 계약과 판정은
site-owned가 아닙니다.

`document-types.json`의 후보 분모는 `site/site-routes.json`의 `Document Types`
서브 메뉴입니다. 후보를 감사할 때는 다음 순서로 닫습니다.

1. package public entrypoint, Usage source registry와 live demo registry에서 runtime
   closure를 정한다.
2. 독립 knowledge, decision, change reason 또는 lifecycle마다 responsibility
   occurrence를 하나 만든다. 한 파일에 여러 책임이 있으면 passport를 나눈다.
3. 모든 occurrence에 `$canonical-module-audit`의 MECE disposition을 정확히 하나
   기록한다.
4. `sourcePath`와 `symbol`을 실제 구현에 연결하고 `denominator`를 occurrence 수와
   일치시킨다.
5. nonconforming occurrence가 남아 있으면 후보 상태를 `audited-tbd`로 유지한다.

Ledger 추가는 `npm run check:canonical-modules -w
@interactive-os/json-document-site`로 검증합니다. Guard는 내비게이션 분모 불일치,
누락된 source·symbol·passport field, 중복 occurrence, 잘못된 disposition과 성급한
TBD 종료를 실패시킵니다.
