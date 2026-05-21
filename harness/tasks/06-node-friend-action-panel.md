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
│                  [친구 삭제] │
└──────────────────────────────┘
```

**isRoutable 토글 제외**: `FriendshipDetailResult`에 `isRoutable` 필드가 없어 초기값을 알 수 없다. 임의값으로 토글을 노출하면 PATCH 시 의도치 않은 값이 전송될 수 있다. 백엔드가 `FriendshipDetailResult`에 필드를 추가하면 별도로 반영한다.

## 사용 API

| 액션 | API |
|---|---|
| alias 변경 / 음소거 토글 | `PATCH /api/v1/friends/{friendId}` |
| 친구 삭제 | `DELETE /api/v1/friends/{friendId}` |

## 상태 동기화 전략

`SocialGraph`가 `friends` prop을 로컬 state로 복사해 관리한다.
모든 mutation은 Server Action 200 OK 수신 후 로컬 state에 반영한다 (낙관적 업데이트 아님).
`router.refresh()` 미사용 — edges는 명시적 요청으로만 갱신되므로 refresh로는 friends[]와 edges를 동시에 일관성 있게 처리할 수 없다.

- **PATCH**: 200 OK 후 `friendsList` 업데이트. alias 변경 시 Cytoscape 노드 라벨도 즉시 갱신.
- **DELETE**: 200 OK 후 `friendsList`와 `edges` 양쪽에서 해당 friendId 제거, 선택 패널 닫힘.
- 실패 시 로컬 state 변경 없이 에러 표시.

## 스코프 외

- `isRoutable` 토글 — 백엔드 응답에 필드 추가 후 별도 반영
- `getOneHopMutualFriendEdges` 공통 친구 엣지 오버레이 — 별도 태스크
- `getTwoHopSuggestionsByPivot` 친구 추천 — Task 07
- 친구 프로필 페이지 (`/friends/[id]`) — 별도 태스크

## 검증

- 노드 클릭 시 해당 친구 정보(이름, 친밀도) 패널 노출
- alias 변경 후 그래프 노드 라벨 즉시 반영
- 음소거 토글 후 상태 유지
- 친구 삭제 후 그래프에서 노드·엣지 제거, 패널 닫힘
- 실패 시 로컬 state 변경 없이 에러 표시
- `npx tsc --noEmit` 에러 없음

## Result

<!-- 작업 완료 후 기록 -->
