# PLAN: Task 06 — 노드 클릭 친구 액션 패널

> 참조 태스크: `harness/tasks/06-node-friend-action-panel.md`
> 작업 브랜치: `agent/task-06-node-friend-action-panel`

---

## 1. 배경

Task 03에서 one-hop 엣지 로딩을 제거한 이후 노드 클릭이 아무 반응이 없는 상태다.
친구 노드를 클릭하면 사이드 패널 하단에 친구 관리 섹션을 노출한다.

---

## 2. 수정 파일 목록

| 파일 | 변경 |
|---|---|
| `src/app/actions/friendship.ts` | 신규 — `updateFriendAction`, `deleteFriendAction` |
| `src/components/FriendActionPanel/FriendActionPanel.tsx` | 신규 — 패널 UI |
| `src/components/FriendActionPanel/useFriendActionPanel.ts` | 신규 — 액션 훅 |
| `src/components/socialGraph/types.ts` | `FriendshipDetail`에 `isRoutable?: boolean` 추가 |
| `src/components/socialGraph/index.tsx` | `friends` prop → 로컬 state, 패널 연결 |

---

## 3. 변경 상세

### `src/app/actions/friendship.ts` (신규)

```ts
"use server";
import { apiClient, isRedirectError } from "@/api/apiClient";
import type { FriendUpdateRequest } from "@/api/model/friendUpdateRequest";

export async function updateFriendAction(friendId: number, body: FriendUpdateRequest) {
  try {
    await apiClient.patch(`/api/v1/friends/${friendId}`, body);
    return { success: true };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false, message: "친구 정보 업데이트에 실패했습니다." };
  }
}

export async function deleteFriendAction(friendId: number) {
  try {
    await apiClient.delete(`/api/v1/friends/${friendId}`);
    return { success: true };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false, message: "친구 삭제에 실패했습니다." };
  }
}
```

### `src/components/socialGraph/types.ts`

`FriendshipDetail`에 `isRoutable?: boolean` 추가.

### `src/components/FriendActionPanel/useFriendActionPanel.ts` (신규)

관리 상태: `aliasInput`, `isLoading`, `error`

props:
- `friend: FriendshipDetail`
- `onAliasUpdate(friendId, newAlias)` — 성공 후 부모 state + cyRef 라벨 갱신
- `onMuteToggle(friendId, newValue)`
- `onRoutableToggle(friendId, newValue)`
- `onDelete(friendId)`

각 액션은 서버 액션 호출 → 200 OK 시 콜백 실행, 실패 시 `error` state 설정 (로컬 state 변경 없음).

### `src/components/FriendActionPanel/FriendActionPanel.tsx` (신규)

```
[친구 이름]  intimacy: {value}
────────────────────────
별칭: [input] [저장]
음소거        [토글]
추천 경유 허용 [토글]
              [친구 삭제]
[에러 메시지 — 실패 시 인라인]
```

- 탭(네트워크/라벨) 무관하게 `selectedNodeId !== null`이면 사이드 패널 하단에 항상 노출
- 삭제 버튼: confirm 없이 즉시 실행

### `src/components/socialGraph/index.tsx`

**추가할 상태:**
```ts
const [friendsList, setFriendsList] = useState<FriendshipDetail[]>(friends);
```
`useGraphData`와 `FriendActionPanel`에 `friendsList` 전달 (기존 `friends` prop 대체).

**alias 업데이트 핸들러:**
```ts
function handleAliasUpdate(friendId: number, newAlias: string) {
  setFriendsList(prev =>
    prev.map(f => f.friendId === friendId ? { ...f, friendAlias: newAlias } : f)
  );
  // elements re-derive 시 layout 재실행 방지 — cyRef 직접 갱신
  cyRef.current?.getElementById(String(friendId)).data('label', newAlias || '');
}
```

**삭제 핸들러:**
```ts
function handleFriendDelete(friendId: number) {
  setFriendsList(prev => prev.filter(f => f.friendId !== friendId));
  setEdges(prev => prev.filter(e => e.friendAId !== friendId && e.friendBId !== friendId));
  setSelectedNodeId(null);
}
```

**isMuted / isRoutable 핸들러:**
```ts
function handleFriendUpdate(friendId: number, patch: Partial<FriendshipDetail>) {
  setFriendsList(prev =>
    prev.map(f => f.friendId === friendId ? { ...f, ...patch } : f)
  );
}
```

**사이드 패널 하단 렌더링:**
```tsx
{selectedFriend && (
  <FriendActionPanel
    friend={selectedFriend}
    onAliasUpdate={handleAliasUpdate}
    onMuteToggle={(id, val) => handleFriendUpdate(id, { isMuted: val })}
    onRoutableToggle={(id, val) => handleFriendUpdate(id, { isRoutable: val })}
    onDelete={handleFriendDelete}
  />
)}
```
`selectedFriend = friendsList.find(f => String(f.friendId) === selectedNodeId) ?? null`

---

## 4. alias 업데이트 시 Cytoscape 처리 이유

`friendsList` state가 바뀌면 `useGraphData`가 elements를 재산출하고
`CytoscapeWrapper`의 `[elements]` useEffect가 발동 → 전체 레이아웃이 재실행된다.
노드 라벨 텍스트만 바뀌는 alias 변경에서 포지션이 초기화되는 건 나쁜 UX이므로,
`cyRef.current.getElementById(id).data('label', newAlias)`로 Cytoscape 내부 데이터만 직접 패치한다.

DELETE는 노드/엣지가 실제로 제거되므로 re-layout이 자연스럽다 → state 업데이트만 사용.

---

## 5. 테스트 시나리오

### Phase 1 — 정적 분석
- `npx tsc --noEmit` 에러 없음
- `npm run lint` 신규 에러 없음

### Phase 2 — UI/상태
- 노드 클릭 → 사이드 패널 하단에 친구 정보 노출
- 빈 영역 클릭 → 패널 닫힘
- alias 입력 후 저장 → 그래프 노드 라벨 즉시 변경, 레이아웃 유지
- 음소거 토글 → 버튼 상태 반전
- isRoutable 토글 → 버튼 상태 반전
- 친구 삭제 → 그래프에서 노드·엣지 제거, 패널 닫힘

### Phase 3 — 실제 API
- PATCH 200 OK 후 alias 변경 실제 반영 확인
- DELETE 200 OK 후 그래프 노드 제거 확인

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
