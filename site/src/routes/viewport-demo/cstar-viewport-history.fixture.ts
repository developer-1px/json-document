// Copied from Cstar's chatTranscriptAnimationAutoScrollHistory viewport regression fixture.
export const cstarViewportHistory = [
  { id: "auto-scroll-history-1-user", role: "user", content: "지난 분기 서비스 운영 현황을 먼저 요약해줘." },
  { id: "auto-scroll-history-1-assistant", role: "assistant", content: "지난 분기에는 주요 기능의 안정화와 배포 경로 단순화에 집중했습니다. 주간 배포 횟수는 유지하면서 긴급 복구가 필요한 변경은 줄었고, 사용자 요청이 많은 대화 기록과 파일 미리보기 흐름을 우선 정비했습니다.\n\n운영 측면에서는 관측 가능한 오류 상태를 늘리고, 자동 복구가 정상 성공처럼 보이지 않도록 상태 표시를 분리했습니다. 그 결과 장애 분석 시 원인 구간을 찾는 시간이 짧아졌고 담당 팀 사이의 인계도 명확해졌습니다." },
  { id: "auto-scroll-history-2-user", role: "user", content: "사용자 피드백에서 반복해서 나온 항목도 정리해줘." },
  { id: "auto-scroll-history-2-assistant", role: "assistant", content: "반복 의견은 세 가지였습니다. 첫째, 긴 답변이 생성될 때 현재 읽고 있는 위치를 잃지 않아야 한다는 점입니다. 둘째, 도구 실행과 결과 이미지가 나타나는 순서를 예측할 수 있어야 한다는 점입니다.\n\n셋째, 작업 완료 문장이 너무 빨리 사라지거나 다음 결과에 밀리지 않아야 한다는 요청이 있었습니다. 특히 작은 화면에서는 마지막 문장과 진행 표시가 화면 아래로 잘려 실제 완료 여부를 확인하기 어렵다는 피드백이 함께 있었습니다." },
  { id: "auto-scroll-history-3-user", role: "user", content: "긴 문서 생성 화면에서 확인할 체크리스트를 만들어줘." },
  { id: "auto-scroll-history-3-assistant", role: "assistant", content: "확인할 항목은 입력 직후 현재 사용자 메시지가 안정적으로 보이는지, 응답이 들어올 공간이 먼저 확보되는지, 문단이 늘어날 때 마지막 생성 위치가 viewport 안에 유지되는지입니다.\n\n또한 사용자가 위로 스크롤하면 자동 추적을 멈추고, 다시 아래로 돌아왔을 때만 추적을 재개해야 합니다. 이미지처럼 높이가 늦게 확정되는 결과도 decode 이후의 실제 높이를 기준으로 처리해야 합니다.\n\n마지막으로 사고 과정이 접힐 때는 완료 상태를 읽을 시간을 확보하고, 접힘과 다음 결과 노출이 같은 프레임에서 경쟁하지 않는지 확인해야 합니다." },
] as const;
