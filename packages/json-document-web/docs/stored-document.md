# 로컬 문서 저장

`createWebStoredDocument`는 브라우저 storage와 정본 편집 source를 연결합니다. source의 `snapshot.value`가 바뀔 때 저장하고 선택만 바뀔 때는 저장하지 않습니다. `connect()`가 구독을 시작하며 반환한 cleanup으로 해제합니다. `subscribe`와 `state`로 `saved`, `unsaved`, `load-error`, `save-error`를 관찰하고 `save()`로 재시도합니다.

```tsx
import {createWebStoredDocument} from '@interactive-os/json-document-web';
import {createSheetEditor, type SheetDocument} from '@interactive-os/json-document-editing';

const stored = createWebStoredDocument({
  key: 'my-sheet',
  storage: () => window.localStorage,
  create: () => createSheetEditor(initialSheet),
  restore: value => createSheetEditor(value as SheetDocument), // 생성자가 유효성을 검증
});
const disconnect = stored.connect();
```

문서 유효성은 `restore`가 정본 생성자에 위임합니다. 읽기·JSON 파싱·복원이 실패하면 메모리에 새 문서를 만들고 실패 상태를 유지합니다. 이때 연결만으로 기존 저장값을 덮어쓰지 않습니다. 이후 실제 편집 또는 명시적인 저장 재시도는 새 내용을 저장합니다. 용량 초과 및 storage 접근 거부는 save-error로 전달합니다.

이 저장소는 한 브라우저의 단일 문서용입니다. 여러 탭의 동시 편집 병합이나 클라우드 동기화는 제공하지 않습니다. History/Selection은 저장하지 않으며 현재 문서 값만 복원합니다.

사이트 `/applications/sheet`가 실제 Usage입니다. Host는 storage key·초기 문서·오류 문구를 정하고, 저장 lifecycle은 이 모듈을 소비합니다.
