# Collaboration

로컬 JSON Document와 같은 여섯 가지 계약을 제공합니다. 값을 읽고, 주소를
찾고, patch를 검사하고, 적용하고, 구독합니다. 다른 점은 여러 참여자가 쓴
변경을 인과 순서로 모아 같은 값에 수렴시키는 일입니다.

네트워크, 로그인, 누가 접속해 있는지는 이 엔진이 갖지 않습니다. 엔진은
변경의 인과와 현재 값을 계산합니다.

Editing의 로컬 History와는 다릅니다. 로컬 History는 한 편집기의 값과
손가락을 되돌립니다. Collaboration은 다른 참여자를 덮어쓰지 않고 한
참여자의 기여를 끄거나 켭니다.

- [Replica](collaboration-replica.md): 한 참여자가 아는 인과 상태
- [Collaborative History](collaboration-history.md): 내 기여만 선택해 되돌리기
- [Text](collaboration-text.md): 같이 쓰는 글자
- [Lifecycle](collaboration-lifecycle.md): epoch, checkpoint, restore
