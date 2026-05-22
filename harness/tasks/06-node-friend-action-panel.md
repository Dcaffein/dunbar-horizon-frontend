# Task 06: 노드 클릭 친구 액션 패널

## 배경

Task 03에서 노드 클릭 시 one-hop 엣지 로딩을 제거한 이후 노드 클릭이 아무 반응 없는 상태다.
친구 노드를 클릭하면 사이드 패널 하단에 "선택된 친구" 섹션이 나타나 친구 관리 액션을 제공한다.

## UI 구조

`selectedNodeId !== null`일 때 사이드 패널 하단에 섹션 노출 (노드 옆 HTML 오버레이 아님 — 좌표 계산 버그 위험).

```
┌──────────────────────────────┐
│  박민준 (고등학교 동창)        │  ← alias 또는 nickname / 친밀도 표시
│  ────────────────────────    │
│  별칭 변경: [________] [저장] │
│  음소거          [토글]       │
│  추천 경유 허용   [토글]       │  ← isRoutable
│                  [친구 삭제] │
└──────────────────────────────┘
```

**추천 경유 허용(isRoutable)**: 이 친구를 anchor로 하는 2-hop 추천/Buzz 경로에서 내가 노출되는 것을 제어하는 백엔드 알고리즘 설정. `FriendshipDetailResult`에 필드가 추가되어 초기값 표시 가능.

## 사용 API

| 액션 | API |
|---|---|
| alias 변경 / 음소거 / isRoutable 토글 | `PATCH /api/v1/friends/{friendId}` |
| 친구 삭제 | `DELETE /api/v1/friends/{friendId}` |

## 상태 동기화 전략

`SocialGraph`가 `friends` prop을 로컬 state로 복사해 관리한다.
모든 mutation은 Server Action 200 OK 수신 후 로컬 state에 반영한다 (낙관적 업데이트 아님).
`router.refresh()` 미사용 — edges는 명시적 요청으로만 갱신되므로 refresh로는 friends[]와 edges를 동시에 일관성 있게 처리할 수 없다.

- **PATCH**: 200 OK 후 `friendsList` 업데이트. alias 변경 시 Cytoscape 노드 라벨도 즉시 갱신. isMuted / isRoutable은 그래프 시각적 변화 없음.
- **DELETE**: 200 OK 후 `friendsList`와 `edges` 양쪽에서 해당 friendId 제거, 선택 패널 닫힘.
- 실패 시 로컬 state 변경 없이 에러 표시.

## 스코프 외

- `getOneHopMutualFriendEdges` 공통 친구 엣지 오버레이 — 별도 태스크
- `getTwoHopSuggestionsByPivot` 친구 추천 — Task 07
- 친구 프로필 페이지 (`/friends/[id]`) — 별도 태스크

## 검증

- 노드 클릭 시 해당 친구 정보(이름, 친밀도) 패널 노출
- alias 변경 후 그래프 노드 라벨 즉시 반영
- 음소거 / isRoutable 토글 후 상태 유지
- 친구 삭제 후 그래프에서 노드·엣지 제거, 패널 닫힘
- 실패 시 로컬 state 변경 없이 에러 표시
- `npx tsc --noEmit` 에러 없음

## Result

**완료일**: 2026-05-23  
**브랜치**: `agent/task-06-node-friend-action-panel`

### 구현 파일

| 파일 | 변경 |
|---|---|
| `src/components/FriendActionPanel/FriendActionPanel.tsx` | 신규 — 패널 UI 컴포넌트 |
| `src/components/FriendActionPanel/useFriendActionPanel.ts` | 신규 — 비즈니스 로직 훅 |
| `src/app/actions/friendship.ts` | 신규 — updateFriendAction, deleteFriendAction Server Action |
| `src/components/socialGraph/index.tsx` | 수정 — friendsList 로컬 state, 패널 연동 |
| `src/components/socialGraph/types.ts` | 수정 — FriendshipDetail에 isRoutable 추가 |

### Phase 2 검증 결과 (Playwright headless)

| 검증 항목 | 결과 |
|---|---|
| [검증1] 초기 패널 숨김 | ✅ |
| [검증2] 노드 탭 후 패널 표시 | ✅ (rx=0.45, ry=0.4) |
| [검증3] 패널 요소 전체 노출 (별칭·저장·음소거·추천경유허용·친구삭제) | ✅ |
| [검증4] 빈 영역 클릭 후 패널 닫힘 | ✅ |
| [검증5] 라벨 탭에서도 패널 표시 | ✅ |
