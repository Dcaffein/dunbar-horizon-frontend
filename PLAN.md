# PLAN: Task 03 — 소셜 그래프 네트워크 API 재연동

> 참조 태스크: `harness/tasks/03-social-graph-network-refactor.md`
> 작업 브랜치: `agent/task-03-social-graph-network-refactor`

---

## 1. 배경

백엔드 네트워크 API가 4개 → 2개로 통합됐다. 기존 엔드포인트는 404.

| 제거된 구 API | 신규 API |
|---|---|
| `GET /networks/top/intimacy` | `GET /api/v1/networks/me?circleSize=` |
| `GET /networks/top/interest` | (동일) |
| `GET /networks/verified?targetIds=` | `GET /api/v1/networks/labels/{labelId}` |
| `GET /networks/mutual/one-hop?targetId=` | **기능 제거** |

**circleSize 값**: `SUPPORT`(~5명) / `SYMPATHY`(~15명) / `KINSHIP`(~50명) / `DUNBAR`(~150명)

---

## 2. 수정 파일

| 파일 | 변경 내용 |
|---|---|
| `src/app/actions/social.ts` | 기존 4개 액션 제거, 2개 신규 액션으로 교체 |
| `src/components/socialGraph/index.tsx` | circleSize 상태/UI 추가, one-hop 로직 제거, 사이드바 재구성 |

---

## 3. 변경 상세

### `src/app/actions/social.ts`

```ts
// 제거
export async function getTopIntimateNetworkAction() { ... }
export async function getTopInterestNetworkAction() { ... }
export async function getCustomNetworkAction(targetIds: number[]) { ... }
export async function getMutualEdgesByOneHopAction(friendId: number) { ... }

// 추가
export async function getFriendsNetworkAction(circleSize: GetFriendsNetworkCircleSize) {
  // GET /api/v1/networks/me?circleSize=DUNBAR 등
  // 응답: NetworkFriendEdgeResult[] → NetworkFriendEdge[] 로 매핑
}

export async function getLabelNetworkAction(labelId: string) {
  // GET /api/v1/networks/labels/{labelId}
  // 응답: NetworkFriendEdgeResult[] → NetworkFriendEdge[] 로 매핑
}
```

### `src/components/socialGraph/index.tsx`

**제거할 상태/로직:**
- `networkMode`, `selectedIds`, `isSnapshot`, `isFetchingEdges`
- `handleNodeClickRef` (비동기 one-hop 로딩 전체)
- `handleActivateTopNetwork`, `handleActivateCustomNetwork`
- `handleThemeChange` 내 데이터 교체 분기 (친밀도/관심도 간 API 전환)

**추가할 상태/로직:**
```ts
const [circleSize, setCircleSize] = useState<GetFriendsNetworkCircleSize | null>(null);
// activeLabelId: 이미 존재 (Task 04에서 추가됨)

async function handleCircleSizeSelect(size: GetFriendsNetworkCircleSize) {
  setCircleSize(size);
  setActiveLabelId(null);     // 라벨 선택 해제
  setIsLoading(true);
  const result = await getFriendsNetworkAction(size);
  if (result.success && result.data) {
    setEdges(result.data);
    setIsGraphActive(true);
  }
  setIsLoading(false);
}

async function handleLabelSelect(labelId: string | null) {
  setActiveLabelId(labelId);
  if (!labelId) return;
  setCircleSize(null);         // circleSize 선택 해제
  setIsLoading(true);
  const result = await getLabelNetworkAction(labelId);
  if (result.success && result.data) {
    setEdges(result.data);
    setIsGraphActive(true);
  }
  setIsLoading(false);
}
```

**노드 클릭 핸들러 단순화:**
```ts
// Before: 비동기 one-hop 엣지 로딩
// After: selectedNodeId 설정만
cy.on("tap", "node", (evt) => {
  setSelectedNodeId(String(evt.target.id()));
});
```

**사이드바 네트워크 탭 UI:**
```
[SUPPORT ~5] [SYMPATHY ~15] [KINSHIP ~50] [DUNBAR ~150]   ← circleSize 4개 버튼
[연결망] [친밀도] [관심도]                                   ← 테마 (유지)
```

---

## 4. 타입 매핑

Orval `NetworkFriendEdgeResult` (optional 필드) → 우리 `NetworkFriendEdge` (required 필드):

```ts
function toNetworkEdge(r: NetworkFriendEdgeResult): NetworkFriendEdge {
  return {
    friendAId: r.friendAId ?? 0,
    friendBId: r.friendBId ?? 0,
    intimacy: r.intimacy ?? 0,
    friendAInterest: r.friendAInterest,
    friendBInterest: r.friendBInterest,
  };
}
```

---

## 5. 테스트 시나리오

### Phase 1 — 정적 분석
- `npx tsc --noEmit` 에러 없음
- `npm run lint` 신규 에러 없음

### Phase 2 — Mock 기반 (Playwright 생략)
- Turbopack 빌드 에러 없이 페이지 로드
- circleSize 버튼 4개 노출
- 노드 클릭 시 one-hop 네트워크 요청 미발생 (Network 탭 확인)

### Phase 3 — 실제 API 연동
- DUNBAR 버튼 클릭 → 엣지 로드 및 그래프 렌더링
- SUPPORT 버튼 클릭 → 더 적은 엣지
- 라벨 탭 → 라벨 선택 → 라벨 멤버 간 그래프 교체
- circleSize ↔ 라벨 전환 시 상호 배타적 동작 (서로 해제)
