# PLAN — Task 08: 2-hop 친구 추천

> 참조 태스크: `harness/tasks/08-two-hop-recommendations.md`
> 작업 브랜치: `agent/task-08-two-hop-recommendations`

## 요구사항 분석

- 친구 노드 클릭 → anchor로 삼아 2-hop 추천 노드를 그래프에 추가
- 추천 노드 클릭 → 공통 친구 엣지 렌더링 + SuggestionPanel 노출
- 빈 영역 클릭 → 추천 노드/엣지 전체 제거
- anchor 재선택 시 기존 추천 전부 교체 (누적 아님)
- B안: elements 배열에 포함 + `CytoscapeWrapper` `isLazyLoadUpdate` 로직 확장

---

## 생성 / 수정 파일

| 파일 | 신규/수정 | 내용 |
|---|---|---|
| `src/app/actions/social.ts` | 수정 | `getTwoHopSuggestionsByAnchorAction`, `getTwoHopMutualFriendsAction` 추가 |
| `src/components/socialGraph/useGraphData.ts` | 수정 | suggestion/mutual 엘리먼트 생성 로직 추가 |
| `src/components/socialGraph/CytoscapeWrapper.tsx` | 수정 | `isLazyLoadUpdate` — suggestion 제거 시에도 fit 비활성화 |
| `src/components/socialGraph/styles.ts` | 수정 | `node.suggestion`, `edge.suggestion-edge`, `edge.mutual-edge` 스타일 추가 |
| `src/components/socialGraph/index.tsx` | 수정 | suggestion 상태 추가, 탭 핸들러 분기, SuggestionPanel 연동 |
| `src/components/SuggestionPanel/SuggestionPanel.tsx` | 신규 | 추천인 패널 UI |

---

## 상세 설계

### `src/app/actions/social.ts` — 추가 2개

```ts
export async function getTwoHopSuggestionsByAnchorAction(anchorId: number)
  → GET /api/v1/networks/suggestions/anchor?anchorId={id}
  → { success, data: AnchorExpansionResult[] }

export async function getTwoHopMutualFriendsAction(targetId: number)
  → GET /api/v1/networks/mutual/two-hop?targetId={id}
  → { success, data: NetworkOneHopsByTwoHopResult[] }
```

### `src/components/socialGraph/useGraphData.ts` — 새 props 추가

```ts
interface UseGraphDataProps {
  // 기존
  friends: FriendshipDetail[];
  edges: NetworkFriendEdge[];
  layoutType: LayoutType;
  // 신규
  suggestionNodes: AnchorExpansionResult[];
  suggestionAnchorId: number | null;
  mutualFriendIds: number[];         // 공통 친구 friendId[]
  selectedSuggestionId: number | null;
}
```

생성 엘리먼트:
- `node.suggestion`: `id = "suggestion-{s.id}"`, `data.type = "suggestion"`, `classes: "suggestion"`
- `edge.suggestion-edge`: `id = "suggestion-edge-{anchorId}-{s.id}"`, source=anchorId, target=`suggestion-{s.id}`, `data.intimacy = s.intimacy`, `classes: "suggestion-edge"`
- `edge.mutual-edge`: `id = "mutual-edge-{fid}-{selectedSuggestionId}"` (selectedSuggestionId 있을 때만), `classes: "mutual-edge"`

### `src/components/socialGraph/CytoscapeWrapper.tsx` — isLazyLoadUpdate 확장

```ts
// 기존: 삭제된 요소가 없을 때만 fit 비활성
// 변경: 삭제된 요소가 전부 suggestion 타입일 때도 fit 비활성
const removedAreSuggestionOnly =
  elementsToRemove.length > 0 &&
  elementsToRemove.every((el: any) =>
    ['suggestion', 'suggestion-edge', 'mutual-edge'].includes(el.data('type'))
  );
isLazyLoadUpdate = hadElementsBefore &&
  (elementsToRemove.length === 0 || removedAreSuggestionOnly);
```

### `src/components/socialGraph/styles.ts` — 추가 스타일

```ts
{ selector: 'node.suggestion',
  style: { 'background-color': '#fef3c7', 'border-color': '#f59e0b',
           'border-style': 'dashed', 'border-width': 2, 'background-opacity': 0.85 } },

{ selector: 'edge.suggestion-edge',
  style: { 'line-color': '#f59e0b', opacity: 0.55, 'line-style': 'dashed',
           width: 'mapData(intimacy, 0, 1, 1, 4)' } },

{ selector: 'edge.mutual-edge',
  style: { 'line-color': '#10b981', opacity: 0.65, width: 2 } },
```

### `src/components/socialGraph/index.tsx` — 상태 및 핸들러

**추가 state:**
```ts
const [suggestionNodes, setSuggestionNodes] = useState<AnchorExpansionResult[]>([]);
const [suggestionAnchorId, setSuggestionAnchorId] = useState<number | null>(null);
const [mutualFriendIds, setMutualFriendIds] = useState<number[]>([]);
const [selectedSuggestionId, setSelectedSuggestionId] = useState<number | null>(null);
const [suggestionSendStatus, setSuggestionSendStatus] = useState<'idle'|'loading'|'sent'|'error'>('idle');
const [suggestionSendError, setSuggestionSendError] = useState<string | null>(null);
```

**tap 핸들러 분기:**
```ts
cy.on("tap", "node", (evt) => {
  const type = evt.target.data("type");
  if (type === "suggestion") {
    // 추천 노드 탭 → mutual friends 로드 + SuggestionPanel
    setSelectedNodeId(null);          // FriendActionPanel 닫기
    const sid = parseInt(evt.target.id().replace("suggestion-", ""));
    setSelectedSuggestionId(sid);
    setSuggestionSendStatus("idle");
    setSuggestionSendError(null);
    handleSuggestionTap(sid);
  } else {
    // 기존 친구 노드 탭 → FriendActionPanel + anchor 추천 로드
    setSelectedSuggestionId(null);    // SuggestionPanel 닫기
    setSelectedNodeId(evt.target.id());
    handleAnchorTap(parseInt(evt.target.id()));
  }
});

cy.on("tap", (evt) => {
  if (evt.target === cy) {
    setSelectedNodeId(null);
    setSelectedSuggestionId(null);
    setSuggestionNodes([]);
    setSuggestionAnchorId(null);
    setMutualFriendIds([]);
  }
});
```

**사이드바 패널:**
- `selectedFriend` 있으면 `FriendActionPanel` (기존)
- `selectedSuggestion` 있으면 `SuggestionPanel` (신규)
- 두 패널은 상호 배타적 (각자 선택 시 상대 null로 초기화)

### `src/components/SuggestionPanel/SuggestionPanel.tsx`

```
┌──────────────────────────────┐
│  phase3target (추천인)         │  ← nickname
│  공통 친구 3명                  │  ← mutualCount
│  [친구 요청 보내기] / [요청 완료]  │
└──────────────────────────────┘
```

props: `suggestion: AnchorExpansionResult`, `sendStatus`, `sendError`, `onSendRequest`

---

## 테스트 시나리오

### Phase 1 — 정적 분석
- `npx tsc --noEmit` 에러 없음

### Phase 2 — UI/State (Playwright)
- 친구 노드 클릭 → 추천 노드 그래프에 나타남 (suggestion 스타일)
- 다른 친구 노드 클릭 → 기존 추천 교체됨
- 추천 노드 클릭 → SuggestionPanel 노출 + FriendActionPanel 숨김
- 빈 영역 클릭 → 추천 노드/엣지 전체 제거

### Phase 3 — 실제 API
- anchor 탭 → `GET /api/v1/networks/suggestions/anchor?anchorId=` 200
- 추천 노드 탭 → `GET /api/v1/networks/mutual/two-hop?targetId=` 200 + 공통 친구 엣지 렌더링
- "친구 요청 보내기" → Server Action 200 → "요청 완료" 전환
