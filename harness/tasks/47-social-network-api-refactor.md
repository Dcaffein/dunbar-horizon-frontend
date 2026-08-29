# Task 47: Social network API 단수화와 통합 edge 조회 전환

## 상태

완료 (2026-08-29). `agent/task-47-social-network-api-refactor`에서 구현·검증 완료.

## 배경

Social network API의 기본 경로가 `/api/v1/networks`에서 `/api/v1/network`로 변경됐다. one-hop과 two-hop 공통 친구 조회는 단일 edge API로 통합됐고, 추천 DTO에서 화면이 사용하던 통계 필드가 제거됐다. 소셜 프로필과 방문 기록 경로도 함께 이동했다.

## API 변경표

| 기능 | 기존 | 신규 |
|---|---|---|
| 내 네트워크 | `GET /networks/me?circleSize=` | `GET /network?circleSize=` |
| 2-hop 추천 | `GET /networks/recommendations?anchorId=` | `GET /network/recommendations?anchorId=` |
| 연결 경로 | `GET /networks/path?targetId=` | `GET /network/path?targetId=` |
| 라벨 네트워크 | `GET /networks/labels/{labelId}` | `GET /network/labels/{labelId}` |
| 2-hop 공통 친구 ID | `GET /networks/mutual/two-hop` | 삭제 |
| 1-hop 공통 edge | `GET /networks/mutual/one-hop` | 삭제 |
| 통합 edge | 없음 | `GET /network/edges?targetId=&baseNetworkFriendIds=` |
| 공개 프로필 | `GET /social/users/{id}` | `GET /social/profiles/{userId}` |
| 방문 기록 | `POST /social/traces` | `POST /traces` |

신규 `GetNetworkEdgesParams`:

```ts
{
  targetId: number;
  baseNetworkFriendIds: number[];
}
```

응답은 `MutualFriendEdgeResult[] { friendAId, friendBId, intimacy }`다.

## DTO 변경

`AnchorExpansionResult`는 이제 `{ id, nickname }`만 반환한다.

제거:

- `intimacy`
- `mutualCount`
- `labelCount`

`ConnectionPathResult.totalCount`가 추가되고 `IntermediaryResult.score`가 제거됐다. 현재 연결 고리 UI는 첫 intermediary의 `userId`, `nickname`만 사용하므로 직접적인 UI 수정은 필수가 아니다.

## 목표

- 삭제된 모든 Social network URL을 신규 URL로 전환한다.
- 두 개의 공통 친구 액션을 단일 edge 조회로 통합한다.
- 신규 edge 응답으로 공통 친구 ID와 추천 노드의 공통 친구 수를 파생한다.
- 제거된 추천 DTO 필드를 조용히 0으로 대체하지 않는다.
- 기존 그래프 확장, 추천 선택, 연결 경로, 공개 프로필, trace 흐름을 보존한다.

## 설계

### Server Action 통합

`src/app/actions/social.ts`

- `getFriendsNetworkAction`: `/api/v1/network`
- `getTwoHopSuggestionsByAnchorAction`: `/api/v1/network/recommendations`
- `getLabelNetworkAction`: `/api/v1/network/labels/{labelId}`
- `getSocialProfileAction`: `/api/v1/social/profiles/{userId}`
- `recordTraceAction`: `/api/v1/traces`
- 기존 `getTwoHopMutualFriendsAction`, `getOneHopMutualFriendEdgesAction` 제거
- `getNetworkEdgesAction(targetId, baseNetworkFriendIds)` 하나로 교체

`src/app/actions/friendship.ts`

- `getConnectionPathAction`: `/api/v1/network/path?targetId=`

배열 query는 생성 클라이언트가 실제로 만드는 형식과 백엔드 바인딩을 확인한 뒤 한 방식으로 고정한다. `baseNetworkFriendIds=1,2`와 키 반복 방식 중 추측으로 선택하지 않는다.

### 그래프 추천 흐름

`src/components/socialGraph/index.tsx`

현재 추천 노드를 선택할 때 두 액션을 별도로 호출해 ID 목록과 edge 목록을 받는다. 신규 API에서는 한 응답으로 다음을 계산한다.

1. `targetId`와 연결된 반대편 ID를 `mutualFriendIds`로 추출
2. 현재 base network 안에 양 끝점이 존재하는 유효 edge만 보존
3. 중복·self-loop 제거
4. 그래프용 `NetworkFriendEdge[]`로 정규화

추천 목록 응답에는 `mutualCount`가 없으므로 추천을 처음 펼친 시점에는 공통 친구 수를 표시하지 않는다. 추천 노드 선택 후 edge 조회가 끝나면 `mutualFriendIds.length`를 표시할 수 있다. 추천마다 선조회하는 N+1 호출은 금지한다.

### 추천 시각화

`src/components/socialGraph/useGraphData.ts`

- `suggestion.intimacy`, `suggestion.mutualCount` 참조 제거
- 추천 edge의 물리·스타일 값은 추천 DTO에 없는 intimacy를 가장하지 않도록 별도 class 기본값 사용
- 선택된 추천 노드의 mutual count가 필요하면 파생 상태를 명시적으로 전달

`src/components/SuggestionPanel/SuggestionPanel.tsx`

- DTO에서 바로 읽던 `mutualCount` 제거
- edge 조회 완료 후 계산된 count를 별도 prop으로 받거나, 선택 전에는 해당 문구를 숨김
- `0`을 서버가 준 값처럼 표시하지 않음

## 수정 예상 파일

| 파일 | 변경 |
|---|---|
| `src/app/actions/social.ts` | 신규 URL, 통합 edge 액션, 제거된 액션 정리 |
| `src/app/actions/friendship.ts` | 연결 경로 URL 변경 |
| `src/components/socialGraph/index.tsx` | edge 단일 호출과 파생 상태 |
| `src/components/socialGraph/useGraphData.ts` | 제거된 추천 필드 참조 제거 |
| `src/components/SuggestionPanel/SuggestionPanel.tsx` | 파생 mutual count 표시 |

필요한 순수 파생 함수는 `src/components/socialGraph/`에 colocate하고 `.test.ts`를 작성한다. Mock이 필요하면 같은 폴더에 fixtures 기반으로 둔다.

## 백엔드 계약 확인

- `baseNetworkFriendIds` 배열 query는 쉼표 구분인가, 반복 query key인가?
- `/network/edges`는 target과 base node를 잇는 edge만 반환하는가, base 내부 edge도 포함하는가?
- 반환 edge의 방향이 보장되는가, 아니면 target이 A/B 어느 쪽에도 올 수 있는가?
- 같은 무방향 edge가 중복 반환될 수 있는가?
- 추천 목록에서 제거된 `mutualCount`를 의도적으로 UI에서 없애는 것이 맞는가?

파생 로직은 방향에 의존하지 않도록 작성할 수 있지만 배열 직렬화는 착수 전에 확정해야 한다.

## 제외 범위

- 라벨 멤버 지연 조회: Task 46
- 친구 요청 API: Task 48
- 그래프 레이아웃 알고리즘 자체 재설계
- 연결 경로에서 `totalCount`를 활용한 신규 UI

## 검증

### Phase 1 — 정적 분석·단위 검증

- `rg '/api/v1/networks|/api/v1/social/users|/api/v1/social/traces' src` 결과 0건
- 제거된 `AnchorExpansionResult.intimacy`, `mutualCount`, `labelCount` 참조 0건
- `npm run lint`
- `npx tsc --noEmit`
- edge 파생 함수 단위 테스트:
  - target이 friendA/friendB인 양 방향
  - 중복 edge
  - self-loop
  - base 밖 ID
  - 빈 응답

### Phase 2 — UI·상태

fixtures의 이수환(user_id=4), 2-hop 시나리오를 사용한다.

- circleSize 네 단계에서 네트워크 정상 갱신
- anchor 확장 시 추천 노드 표시
- 추천 노드 선택 시 `/network/edges` 한 번만 호출
- 공통 친구 edge 표시와 count 일치
- 선택 해제 시 추천용 edge 정리, 기존 zoom/pan 보존
- 라벨 네트워크 정상 표시
- 비친구 공개 프로필 접근 및 친구 프로필 trace 기록
- 스크린샷은 `harness/verify/verify-47-*.png`로 저장

### Phase 3 — 예외

- 추천 0명, edge 0개
- edge에 targetId가 없는 잘못된 항목 방어
- 빠른 추천 노드 전환 시 이전 응답이 현재 선택에 섞이지 않음
- edge 조회 실패 시 기존 친구 그래프 유지, 추천 부분만 실패 표시
- 공개 프로필 404와 trace 실패가 페이지 전체를 잘못 redirect하지 않음
- circle/label network 실패를 빈 네트워크로 오인하지 않음

각 Phase 통과 후 저장소 정책에 따라 세이브 포인트 커밋을 만든다.

## 브랜치

`agent/task-47-social-network-api-refactor`

## Result

### 구현

- 모든 `/api/v1/networks/**` 호출을 `/api/v1/network/**`로 전환했다.
- 공개 프로필을 `/api/v1/social/profiles/{userId}`, 방문 기록을 `/api/v1/traces`로 전환했다.
- 삭제된 one-hop/two-hop 액션을 `getNetworkEdgesAction` 하나로 통합했다.
- `baseNetworkFriendIds`는 생성 클라이언트와 같은 쉼표 구분 query로 직렬화했다.
- `deriveTargetNetworkEdges`가 target 방향, 누락 ID, self-loop, base 밖 edge와 무방향 중복을 방어한다.
- 추천 DTO의 제거 필드를 삭제하고, edge 성공 후 파생된 공통 친구 수만 패널에 표시한다.
- request sequence로 이전 추천 목록·edge 응답을 폐기한다.
- 그래프 밖 anchor는 노드 렌더 완료를 기다린 후 추천 edge를 추가한다.

### 검증

| 항목 | 결과 |
|---|---|
| 전체 Vitest | 4개 파일, 16개 테스트 통과 |
| Task 47 변경 파일 ESLint | 오류 0건 |
| 제거 URL·추천 DTO 필드 검색 | 잔여 참조 0건 |
| SUPPORT network | 실제 백엔드 정상 렌더링 |
| 그래프 밖 anchor 추천 | DJ 권대중 기준 추천 4건 정상 렌더링 |
| 통합 edge | 정기완 선택 시 공통 친구 1명과 edge 일치 |
| Task 46 회귀 | `ku` 라벨 멤버 15명 및 라벨 테스트 8건 통과 |

스크린샷:

- `harness/verify/verify-47-01-support-network.png`
- `harness/verify/verify-47-02-recommendations.png`
- `harness/verify/verify-47-03-recommendation-edge.png`
- `harness/verify/verify-47-04-label-network.png`

프로젝트 전체 lint의 기존 15건과 Flag 생성 코드의 `GetUserFlagsByRoleParams` 모델 배럴 누락 1건은 Task 47 외부 기준선으로 남겼다. 실제 `/users/{id}` 진입은 방문 trace를 생성하므로 자동 UI 검증에서는 실행하지 않았고, 세 URL은 코드 전환과 제거 URL 검색으로 확인했다.

### 커밋

- `994918b` — `feat(task-47): 신규 social network 계약을 연결한다`
- `9a4e1d8` — `feat(task-47): 통합 edge 기반 추천 흐름을 연결한다`
