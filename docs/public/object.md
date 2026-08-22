# Object

Object는 안정된 ID를 가진 객체를 집는 편집기입니다. 줄 번호가 아니라 키
가족(key family)을 씁니다. 화면에서 어디를 눌렀는지는 제품이 계산하고,
editor에는 객체 ID만 넘깁니다.

색을 채우거나 지우는 요청은 Intent로 들어갑니다. 기하와 히트 테스트는
editor 밖에 남습니다.

아래 Live Demo에서 Object와 그 손을 평면 위에 그린 Canvas를 함께 만질 수
있습니다. 빈 곳·객체·집합을 만지는
손은 [Affordance 평면](affordance.md#평면)을 따릅니다.

## Live Demo

```live-demo
/demo/object
```

```live-demo
/demo/canvas
```
