# 입력 진단 기록 API

브라우저 전용 public entrypoint는 `@interactive-os/json-document-web/interaction-recording`입니다.
기존 Web root entrypoint의 DOM 없는 소비자 계약을 유지합니다.

`createWebInteractionRecorder({ document, maxBytes?, maxRecords? })`는 한 document의
화면 전역에서 입력 증거를 수집합니다. `start()` 전과 `stop()` 후에는 수집하지 않습니다.
`stop(reason?)`과 `snapshot()`은 버전 1 `WebInteractionRecording`을 반환하며,
`subscribe()`는 시작·종료를 알립니다. `dispose()`는 이벤트/DOM observer를 해제합니다.

```ts
import {
  createWebInteractionRecorder, createWebRecordingArchive, bindWebRecordingArchive,
} from "@interactive-os/json-document-web/interaction-recording";

const recorder = createWebInteractionRecorder({ document });
const archive = createWebRecordingArchive({
  endpoint: "/__interaction-recordings", storage: localStorage, fetch,
});
const unbind = bindWebRecordingArchive(recorder, archive, (result, recording) => {
  if (recording.endedAt) console.log(result);
});
recorder.start();
// 실제 입력기로 재현한 뒤:
recorder.stop();
// 화면을 폐기할 때 recorder.dispose(); unbind();
```

Usage: 개발 서버의 모든 화면 우측 하단 REC. `/demo/markdown-caret`의 source tabs에서
`InteractionRecordingControls.tsx` 및 정본 recorder/DOM/archive 소스를 확인할 수 있습니다.

## 증거와 인과 관계

- `event.capture`: window capture 시점의 keyboard/composition/beforeinput/input,
  selection, focus, pointer, clipboard 이벤트. `event.after-dispatch`는 microtask 시점의
  `defaultPrevented`와 DOM을 기록합니다. 모든 listener는 입력을 취소하지 않습니다.
- 같은 이벤트 객체는 같은 `eventId`, 같은 DOM 대상은 같은 `targetId`를 사용합니다.
  `sequence`는 기록 순서, `milliseconds`는 시작 이후의 단조 증가 시간입니다.
- `dom.mutation`은 MutationObserver 전달 시점입니다. 동기 DOM 변경의 정확한 시각이나
  특정 이벤트의 원인이라고 단정하지 않으며 `eventId`는 null입니다.
- `registerWebInteractionSource(root, name, read)`는 REC 시작 시 정본 상태를 제공합니다.
  반환한 해제 함수를 binding 수명 끝에 호출합니다.
- `traceWebInteraction(root, kind, read, event?)`는 활성 수집기가 있을 때만 `read`를
  평가합니다. canonical owner가 명령, 문서 커밋, 히스토리 상태를 직접 기록하며 monkey patch하지 않습니다.
  contenteditable binding은 조합 상태·source selection·model·revision·Undo/Redo 가능 여부와
  `replace`/개행/Undo/Redo 명령을 이 API로 기록합니다.
- 기록은 일반 input/textarea/contenteditable에서도 가능합니다. 내부 model/command 증거는
  이 API를 연결한 owner에만 포함됩니다. iframe·다른 브라우저 탭·OS 후보창 영상은 포함하지 않습니다.

## 보관과 범위

`createWebRecordingArchive`의 `stage`는 브라우저 임시 보관, `save`는 JSON POST와
성공 확인 후 임시본 제거, `pending`은 실패/이탈 시 남은 임시본 복구입니다.
`bindWebRecordingArchive`는 기본 2초 간격 checkpoint와 종료 snapshot을 순서대로 저장합니다.
`pagehide`는 종료를 시도하며 전송 완료를 보장하지 않습니다. 전송되지 못한 임시본은 다음 mount에서 재시도합니다.
저장 실패는 `WebRecordingSaveResult`로 드러납니다. 저장소 할당량도 부족하면 메모리에 있는
기록을 `downloadWebInteractionRecording(document, recording)`으로 내려받을 수 있습니다.
`serializeWebInteractionRecording`은 공유/분석용 JSON을 만듭니다.

사이트의 로컬 Vite 서버는 `.artifacts/interaction-recordings/<UUID>.json`에 원자적으로
보관합니다. GET `/__interaction-recordings`는 목록, GET `/__interaction-recordings/<UUID>`는
보관 기록입니다. 서버 context에는 worktree/branch/HEAD가 있으며 실제 작업 중 미커밋 코드는
HEAD만으로 식별되지 않습니다. 기록은 git에서 제외하며 자동 삭제하지 않습니다.
운영 빌드에는 사이트 REC UI와 저장 endpoint가 포함되지 않습니다.

키와 입력 내용이 기록에 포함됩니다. password, `[data-recording-private]`, REC controls는 제외합니다.
민감한 영역을 포함한 편집 root도 통째로 제외합니다. 문자열은 8192자를 넘으면 원래 길이와
접두사를 기록하고 `truncated`를 표시합니다. 기본 4 MB 또는 10000개 기록에 도달하면
`reason: "limit"`로 종료·보관합니다. 초기 DOM 외에도 편집 이벤트 전후 DOM과 정본 값이
포함되므로 작은 테스트 문서로 재현하면 가장 명확합니다.
