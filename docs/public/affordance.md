# 어포던스

제품의 화면은 호스트가 그립니다. json-document가 최전선에서 주는 것은
리스트박스나 나무가 아니라, 30년 동안 같은 손으로 학습된 키보드와
마우스 행동입니다.

`@interactive-os/json-document-affordance`가 그 계약을 닫습니다. Shift는
범위를 늘리고, Mod는 토글하고, 나무는 왼쪽이 접힘·오른쪽이 펼침이며,
Delete는 고른 것을 지우고, Mod+Z는 되돌립니다. 단축키를 제품마다 바꾸지
않습니다.

```sh
npm i @interactive-os/json-document-affordance
```

Editing은 선택과 작업을 기억합니다. Adapter는 키 chord를 command로
번역합니다. Connector는 구독과 질의를 붙입니다. 어포던스는 그 command가
무슨 손인지를 정합니다. 호스트는 마크업과 장르 Intent만 가집니다.

| 어포던스 | API | 손 |
| --- | --- | --- |
| [고르기](affordance-select.md) | `pointerSelect`, `resolveAffordanceKey` | 클릭, Shift 범위, Mod 토글, 화살표 |
| [접기](affordance-fold.md) | `treeAffordance` | 나무 왼쪽 접힘, 오른쪽 펼침 |
| [드래그](affordance-drag.md) | `dragOffset`, `dragShouldCommit` | 고른 대상을 포인터로 옮김 |
| [되돌리기](affordance-history.md) | `historyAffordance` | Mod+Z, Mod+Shift+Z |

라이브 화면은 이 손을 호스트 그림에 붙인 증명입니다. 위젯을 가져가는
입구가 아닙니다.
