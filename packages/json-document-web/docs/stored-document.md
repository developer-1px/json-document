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

## IndexedDB와 파일

`createWebIndexedDBStorage(databaseName)`은 IndexedDB의 documents store를 제공한다. `openWebStoredDocument`는 비동기 로드를 끝낸 후 같은 `WebStoredDocument` lifecycle을 반환한다. 로드가 끝나기 전에 편집기를 노출하지 않아 늦은 읽기가 사용자 편집을 덮어쓰지 않는다. 값 변경은 순서대로 저장하고 saving/saved/save-error를 관찰한다. `save()`는 비동기 저장 완료를 기다릴 수도 있다.

`legacyStorage`는 IndexedDB에 해당 key가 없을 때만 읽는다. 정본 restore로 검증한 뒤 connect 시 새 저장소에 저장하며 기존 localStorage 값은 삭제하지 않는다. 읽기 실패 시 자동 덮어쓰기를 하지 않는다. IndexedDB adapter의 revision 비교는 다른 탭의 더 최신 저장을 거부해 조용한 덮어쓰기를 막는다. 동시 편집 병합은 제공하지 않는다. 충돌 시 현재 작업을 파일로 백업하고 다시 열어야 한다.

`downloadWebDocumentFile(value, filename)`은 portable JSON을 내려받고 `readWebDocumentFile(file, maxBytes?)`는 기본 10MB 한도 내의 파일을 파싱한다. 문서 타입 검증은 반환값을 받은 정본 owner가 수행한다. 파일 가져오기는 해당 앱의 편집 명령으로 적용한다.

Usage: `/applications/ui-builder`의 `문서 보관`과 자동 저장. `UIBuilderApplication`은 저장 key·초기 fixture·포트를 조합하며 lifecycle과 serialization은 이 패키지를 소비한다.
