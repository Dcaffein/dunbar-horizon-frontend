# Task 08: 2-hop 친구 추천

## 배경

Task 07에서 이메일 직접 입력 방식(이미 아는 사람 연결)을 구현했다.
Task 08은 그 반대 방향 — **내 친구(anchor)를 경유해 새로운 인연을 발견**하는 탐색 기능이다.

추천은 패널 리스트가 아닌 **그래프 위에 직접 노드로 렌더링**된다.
Cytoscape 레이아웃 물리 엔진의 영향을 받으며 기존 친구 노드와 시각적으로 구분되는 별도 스타일이 적용된다.

## 용어

- **anchor**: 나와 추천인을 연결하는 중간 친구. 내 기존 친구 노드 중 클릭된 것.
- **추천인**: anchor의 친구이자 나의 잠재적 친구 (`AnchorExpansionResult`)
- **공통 친구**: 나와 추천인을 동시에 아는 내 기존 친구들 (추천인 클릭 시 엣지로 시각화)

## 사용 API

| 액션 | API |
|---|---|
| anchor를 통한 2-hop 추천 | `GET /api/v1/networks/suggestions/anchor?anchorId={id}` → `AnchorExpansionResult[]` |
| 추천인의 공통 친구 목록 | `GET /api/v1/networks/mutual/two-hop?targetId={id}` → `NetworkOneHopsByTwoHopResult[]` |
| 추천인에게 친구 요청 | `POST /api/v1/friend-requests` `{ receiverId: number }` |

```ts
AnchorExpansionResult {
  id?: number;
  nickname?: string;
  intimacy?: number;     // anchor와 추천인 간 친밀도 → 추천 엣지 굵기/거리에 반영
  mutualCount?: number;  // 공통 친구 수 → 추천 노드 클릭 시 패널에 표시
  labelCount?: number;
}

NetworkOneHopsByTwoHopResult {
  friendId?: number;     // 추천인을 아는 내 기존 친구의 ID
}
```

## 그래프 인터랙션 흐름

```
1. 기존 친구 노드 클릭 (anchor 선택)
     ↓
   getTwoHopSuggestionsByAnchor({ anchorId })
     ↓
   추천 노드들이 그래프에 추가 (별도 시각 스타일)
   anchor → 추천 노드 간 엣지 생성 (intimacy 반영)
   기존 레이아웃 물리 엔진이 새 노드 배치 처리

2. 추천 노드 클릭
     ↓
   getTwoHopMutualFriends({ targetId: recommendation.id })
     ↓
   공통 친구 friendId[] → 해당 기존 친구 노드 → 추천 노드 간 엣지 생성
   패널에 추천인 정보 + "친구 요청 보내기" 버튼 노출

3. 빈 영역 클릭
     ↓
   추천 노드 + 추천 엣지 + 공통 친구 엣지 모두 제거
   그래프 원래 상태 복귀
```

## 시각 스타일

추천 노드와 추천 엣지는 기존 친구와 시각적으로 구별된다. 구체적 스타일(색상·모양·투명도)은 PLAN 단계에서 결정하되, 기존 `layout.ts`의 테마 시스템에 `suggestion` 클래스로 추가한다.

- 추천 노드: 기존 친구 노드와 다른 색상 또는 점선 테두리
- anchor → 추천 엣지: `AnchorExpansionResult.intimacy` 값으로 굵기/거리 결정
- 공통 친구 → 추천 엣지: 추천 노드 클릭 시에만 표시, 구별되는 색상

## 상태 관리

`SocialGraph` 컴포넌트의 기존 로컬 state(`friendsList`, `edges`)는 변경 없음. 별도 state로 관리:

- `suggestionNodes: AnchorExpansionResult[]` — 현재 표시 중인 추천 노드
- `suggestionEdges` — anchor → 추천 노드 엣지
- `mutualEdges` — 추천 노드 → 공통 친구 엣지 (추천 노드 클릭 시)
- anchor 재선택 시 기존 추천 노드/엣지 전부 교체

`isLazyLoadUpdate` 플래그처럼 추천 노드 추가 시 `fit` 비활성화해 현재 줌/팬 유지.

## 친구 요청 CTA

추천 노드 클릭 → `FriendActionPanel`과 별도인 추천 패널(또는 패널 하단 섹션) 표시.
"친구 요청 보내기" → Task 07의 `sendFriendRequestAction({ receiverId: result.id })` 재사용.
`AnchorExpansionResult.id`로 바로 요청 — 이메일 검색 불필요 (id 이미 보유).

## 스코프 외

- `/requests` 추천 탭 (anchor 기반 종합 추천) — 별도 태스크
- 추천 노드 페이지네이션
- 추천 거절/숨기기 — 백엔드 API 없음

## 검증

- 친구 노드 클릭 → 추천 노드들이 그래프에 나타남 (별도 시각 스타일)
- 추천 노드가 레이아웃 물리 엔진에 의해 배치됨 (줌/팬 유지)
- 추천 노드 클릭 → 공통 친구 노드와의 엣지 렌더링
- 추천 노드 클릭 → "친구 요청 보내기" 버튼 노출
- 요청 전송 → 버튼 "요청 완료" 전환
- 빈 영역 클릭 → 추천 노드/엣지 전체 제거, 그래프 원복
- `npx tsc --noEmit` 에러 없음

## Result

**완료일**: 2026-05-29
**브랜치**: `agent/task-08-two-hop-recommendations`

### 구현 파일

| 파일 | 변경 |
|---|---|
| `src/app/actions/social.ts` | 수정 — `getTwoHopSuggestionsByAnchorAction`, `getTwoHopMutualFriendsAction` 추가 |
| `src/components/socialGraph/useGraphData.ts` | 수정 — suggestion/mutual 엘리먼트 생성 |
| `src/components/socialGraph/CytoscapeWrapper.tsx` | 수정 — suggestion 제거 시 fit 비활성 |
| `src/components/socialGraph/styles.ts` | 수정 — `node.suggestion`, `edge.suggestion-edge`, `edge.mutual-edge` 스타일 |
| `src/components/socialGraph/index.tsx` | 수정 — suggestion 상태, 탭 분기, SuggestionPanel 연동 |
| `src/components/SuggestionPanel/SuggestionPanel.tsx` | 신규 — 추천인 패널 UI |

### Phase 2 검증 결과 (Playwright headless)

| 검증 항목 | 결과 |
|---|---|
| 친구 노드 탭 → FriendActionPanel 표시 | ✅ |
| suggestion 노드/엣지 렌더링 (amber 픽셀 감지) | ✅ |
| suggestion 노드 탭 → SuggestionPanel 표시 | ✅ |
| "추천" 배지 노출 | ✅ |
| "친구 요청 보내기" 버튼 노출 | ✅ |
| FriendActionPanel → SuggestionPanel 전환 | ✅ |
| 빈 영역 클릭 → SuggestionPanel 닫힘 | ✅ |

> suggestion 노드는 fcose 물리 엔진에 의해 초기 뷰포트 밖에 배치됨 — 줌아웃 + 팬 후 amber 픽셀 검색으로 검증.
