# Task 23: 그래프 노드/엣지 circleSize 필터

## 배경

현재 `useGraphData`는 전체 친구 목록(`friendsList`)을 항상 노드로 생성한다.
circleSize가 SUPPORT(엣지 2개)여도 58개 노드 전원이 렌더링되어 대부분이 고립 노드로 표시된다.
친구 수가 늘어날수록 Cytoscape 렌더링 부담이 증가하고 그래프 가독성이 저하된다.

## 작업 범위

### 1. 엣지 circleSize 필터 (이미 구현됨)
`getFriendsNetworkAction(circleSize)` 호출 시 파라미터 전달 → `social.ts` 기반으로 확인 완료.

### 2. 노드 circleSize 필터 (신규)
`useGraphData`에서 `friends` 전체를 노드로 만들던 것을 변경:
- **표시 대상** = 현재 circleSize 엣지에 포함된 친구 + `manuallyAddedIds`
- 엣지가 없는 친구는 노드 자체를 생성하지 않음 (isolated 노드 제거)

```ts
// useGraphData.ts 변경 방향
const edgeNodeIds = useMemo(() => {
  const ids = new Set<number>();
  edges.forEach(e => { ids.add(e.friendAId); ids.add(e.friendBId); });
  manuallyAddedIds.forEach(id => ids.add(id));
  return ids;
}, [edges, manuallyAddedIds]);

const allDisplayFriends = friends.filter(f => edgeNodeIds.has(f.friendId));
```

## 사용 API

```ts
GET /api/v1/networks/me?circleSize=SUPPORT|SYMPATHY|KINSHIP|DUNBAR
→ NetworkFriendEdgeResult[]  // 해당 circleSize 내 엣지만
```

## 고려사항

- `FriendActionPanel` 클릭(사이드바 아이콘) — `friendsList` 기반이라 영향 없음
- Buzz 발신자 하이라이트 — `unreadBuzzSenderIds` + `buzzUnreadSet` 기반이라 영향 없음
- `manuallyAddedIds`(Task 21 수동 추가 노드) — 엣지가 없어도 노드로 포함해야 함
- suggestion 노드/엣지 — `useGraphData` 내 별도 처리, 영향 없음
- `node.isolated` 스타일 클래스 — 노드 자체가 없어지므로 사실상 불필요해짐

## 검증

- SUPPORT 뷰: 엣지에 포함된 친구만 노드로 렌더링 (고립 노드 없음)
- circleSize 변경 시 노드/엣지 함께 재렌더링
- 수동 추가 노드([+] 클릭) 정상 표시
- FriendActionPanel·Buzz 하이라이트 정상 동작
- `npx tsc --noEmit` 에러 없음

## Result

- `useGraphData.ts` 단일 파일 수정으로 완결
- `allDisplayFriends`를 전체 friends → edges 기반 edgeNodeIds 필터로 변경
- Phase 2: 7/7 통과 — SUPPORT 2개 / KINSHIP 42개 / DUNBAR 52개 (circleSize별 단계적 증가)
- Phase 3: 5/5 통과 — 비활성 시 노드 없음, 전체 58명 분류 정합성 확인
- `npx tsc --noEmit` 에러 없음
