# Task 12: 그래프 중복 렌더링 방어

## 배경

`useGraphData.ts`에서 엣지 ID를 `edge-{minId}-{maxId}` 패턴으로 정규화하고 있어
A→B와 B→A가 같은 ID를 갖도록 되어 있다.
그러나 실제 중복 제거는 하지 않아, 백엔드가 양방향 엣지를 모두 반환할 경우
동일 ID 요소가 배열에 두 개 존재하게 된다.
Cytoscape는 중복 ID를 무시하거나 경고를 내므로 현재는 우연히 작동 중인 상태다.

노드도 동일한 문제가 잠재적으로 존재한다.

## 변경 범위

`src/components/socialGraph/useGraphData.ts`의 노드·엣지 생성 부분에
`Set` 기반 중복 필터 추가.

- **엣지**: `edge-${minId}-${maxId}` ID 기준으로 이미 처리한 엣지 건너뜀
- **노드**: `friendId` 기준으로 이미 처리한 노드 건너뜀

추가 추상화나 리팩터링 없이 필터 한 줄 수준의 최소 변경.

## 검증

- `npx tsc --noEmit` 에러 없음
- 백엔드가 동일 엣지를 두 번 반환하는 케이스에서 그래프에 엣지 하나만 렌더링됨

## Result

### 변경 내용
`useGraphData.ts` 에 `Set` 기반 중복 필터 2개 추가.

- **노드**: `seenNodeIds: Set<number>` — `friendId` 기준, 이미 처리한 노드 건너뜀
- **엣지**: `seenEdgeIds: Set<string>` — `edge-{minId}-{maxId}` 기준, filter 내에서 minId/maxId 계산 후 중복 건너뜀

### Phase 1 ✅
- `npx tsc --noEmit` 에러 없음
