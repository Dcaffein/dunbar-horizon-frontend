# Task 31: 그래프 미포함 친구에서 친구 추천받기

## 배경

사이드바 친구 목록에는 현재 그래프에 없는 친구도 표시된다.
목록에서 그래프 미포함 친구를 클릭하면 `FriendActionPanel`이 열리고
"친구 추천받기" 버튼이 활성화되어 있다.

현재 `handleAnchorTap`은 Cytoscape에서 앵커 노드의 위치를 읽어
suggestion 노드를 배치하는데, 앵커가 그래프에 없으면 위치를 가져오지 못해
렌더링 오류가 발생한다.

---

## 변경 방향

"친구 추천받기" 클릭 시 앵커 친구가 그래프에 없으면:

1. `handleAddToGraph(anchorId)` 호출 → 앵커를 manual 노드로 그래프에 추가
2. Cytoscape가 노드를 실제로 렌더링할 때까지 대기 (타이밍 처리 필요)
3. 앵커 노드 위치를 읽어 기존 suggestion 흐름 그대로 진행
4. 결과: 앵커 친구 + 2hop 추천 친구들이 모두 그래프에 표시됨

---

## 변경 상세

### `src/components/socialGraph/index.tsx` — `handleAnchorTap` 수정

```
handleAnchorTap(anchorId):
  1. inGraph = graphNodeIds.has(String(anchorId))
  2. if (!inGraph):
       handleAddToGraph(anchorId) 호출
       앵커 노드가 cyRef에 나타날 때까지 대기
         → cyRef.current?.getElementById(String(anchorId)).length > 0 확인
         → setTimeout 또는 requestAnimationFrame 루프 (최대 ~500ms)
  3. getTwoHopSuggestionsByAnchorAction(anchorId) 호출
  4. 앵커 노드 위치 읽기 → setSuggestionAnchorPos
  5. setSuggestionNodes, setSuggestionAnchorId (기존 로직 동일)
```

#### 타이밍 처리 주의사항

`handleAddToGraph` → React 상태 변경 → CytoscapeWrapper `useEffect[elements]` → Cytoscape 노드 생성
순서로 비동기 처리됨. `setManuallyAddedIds` 이후 즉시 `getElementById`를 호출하면 노드가 없다.

구현 방법 (둘 중 선택):

**A. polling 방식** (단순)
```ts
await new Promise<void>((resolve) => {
  const check = () => {
    const node = cyRef.current?.getElementById(String(anchorId));
    if (node && node.length > 0) return resolve();
    requestAnimationFrame(check);
  };
  check();
});
```

**B. pendingAnchorId state + useEffect 방식** (reactive)
- `pendingAnchorId` state 추가
- `graphNodeIds` 변경 시 pendingAnchorId가 그래프에 등장했으면 suggestion 흐름 진행
- 상태 관리가 복잡해질 수 있음

A 방식이 간단하고 기존 패턴과 일관성이 높음.

---

---

## 추가 요구사항 1: 탭 텍스트 변경

`src/components/socialGraph/index.tsx` 482줄

```
"라벨" → "Label"
```

---

## 추가 요구사항 2: 라벨 패널 멤버 클릭 → 노드 하이라이트

라벨 패널의 멤버 칩(`label.members`)을 클릭하면 해당 멤버의 그래프 노드가 하이라이트되어야 한다.

### 구현 방향

- `LabelManager`에 `onMemberClick?: (memberId: number) => void` prop 추가
- 멤버 칩 `<span>` 영역에 `onClick={() => onMemberClick?.(m.id)}` 추가
  - 단, 칩 안의 `×` 삭제 버튼 클릭은 `e.stopPropagation()`으로 멤버 클릭과 분리
- `socialGraph/index.tsx`에서 `onMemberClick={(memberId) => setSelectedNodeId(String(memberId))}` 전달
  - `setSelectedNodeId` 변경 → 기존 하이라이트 로직(`useEffect[selectedNodeId]`)이 자동으로 작동

---

## 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `src/components/socialGraph/index.tsx` | `handleAnchorTap` 수정, 탭 텍스트 "라벨" → "Label", `onMemberClick` 핸들러 추가 |
| `src/components/Label/LabelManager.tsx` | `onMemberClick` prop 추가, 멤버 칩 클릭 이벤트 연결 |

---

## 검증

### Phase 1
- `npx tsc --noEmit` 에러 없음
- `npm run lint` 에러 없음

### Phase 2
- 그래프에 **있는** 친구 → "친구 추천받기" → 기존과 동일하게 동작 (회귀 없음)
- 그래프에 **없는** 친구 (사이드바 목록에서 클릭) → "친구 추천받기"
  → 앵커 친구가 manual 노드로 그래프에 추가됨
  → suggestion 노드들이 앵커 주위에 배치됨
  → SuggestionPanel 표시 (기존 흐름 동일)
- 사이드바 탭 텍스트: "라벨" → "Label" 로 표시
- 라벨 패널 활성화 → 멤버 칩 클릭 → 해당 노드 하이라이트
- 멤버 칩의 `×` 버튼은 여전히 삭제만 동작 (하이라이트 미발생)

### Phase 3
- 추천 결과가 0건인 경우 → 앵커 노드는 그래프에 남고, suggestion 노드 없음
- Cytoscape 렌더 전에 결과가 오는 극단 케이스 → polling 타임아웃 내에 처리
- 멤버 클릭 시 해당 노드가 그래프에 없는 경우 → 하이라이트 없음 (선택 무시)
