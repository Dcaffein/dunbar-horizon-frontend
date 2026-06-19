# Task 21: 그래프 친구 동적 추가

## 배경

현재 그래프는 circleSize 뷰에 포함된 친구들만 노드로 표시된다.
뷰 밖에 있는 친구를 클릭 한 번으로 그래프에 추가해 네트워크 탐색을 할 수 있어야 한다.

> 드래그 앤 드롭 → **클릭으로 추가** 방식으로 변경 (구현 복잡도 대비 UX 동등)

## UX 흐름

```
사이드바 친구 목록
  → 현재 그래프에 없는 친구 카드에 [+] 버튼 표시
  → [+] 클릭 → 해당 친구 노드 그래프에 동적 추가 (점선 테두리 임시 스타일)
  → 추가된 노드 클릭 → getOneHopMutualFriendEdges()로 현재 네트워크와의 엣지 로드
```

## 사용 API

| 액션 | API |
|---|---|
| 공통 1-hop 엣지 조회 | `GET /api/v1/networks/mutual/one-hop?targetId={id}` → `MutualFriendEdgeResult[]` |

## 기술 고려사항

- `graphNodeIds` (현재 elements의 노드 ID Set) 기반으로 사이드바 [+] 버튼 표시 여부 결정
- `manuallyAddedIds: Set<number>` state → `useGraphData`에 전달 → `type: "manual"` 노드 생성
- 수동 추가 노드 스타일: 점선 테두리 (`border-style: dashed`), 연보라 계열
- 빈 공간 클릭 시 수동 추가 노드 **유지** (제거 없음)
- 노드 클릭 시 manual 여부 분기: manual → one-hop 엣지 로드, 일반 → 기존 anchor tap 로직

## 스코프 외

- 추가된 노드의 영구 저장 (circleSize 변경)

## 검증

- 그래프 활성화 후 뷰 밖 친구에 [+] 버튼 표시
- [+] 클릭 → 점선 테두리 노드 그래프에 추가
- 추가된 노드 클릭 → 현재 네트워크와의 엣지 렌더링
- `npx tsc --noEmit` 에러 없음

## Result

- `graphNodeIds`를 `elements` 기반 → `edges` 기반으로 수정 (전체 친구가 노드로 생성되어 [+] 버튼이 표시되지 않던 버그 수정)
- `graphNodeIds` = 현재 circleSize 엣지의 friendAId/friendBId + manuallyAddedIds
- Phase 2: 10/10 통과 — SUPPORT 뷰 [+] 56개, 인디케이터 2개, 클릭 후 노드 추가 확인
- Phase 3: 6/6 통과 — circleSize 전환 시 초기화, 중복 방지, 즉시 반응, 비활성 시 미노출
- `npx tsc --noEmit` 에러 없음
