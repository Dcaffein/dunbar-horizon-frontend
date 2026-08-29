# PLAN: Task 47 — Social network API 단수화와 통합 edge 조회

배경과 계약은 `harness/tasks/47-social-network-api-refactor.md`를 따른다.

## 상태

완료 (2026-08-29). 세 Phase 구현·검증과 실제 백엔드 UI 확인을 마쳤다.

## 1. 요구사항 분석

OpenAPI 계약에서 Social network URL이 복수형 `/networks/**`에서 단수형 `/network/**`로 바뀌었다. 기존 one-hop/two-hop 공통 친구 API는 `GET /api/v1/network/edges` 하나로 통합됐으며 추천 DTO는 `{ id, nickname }`만 남았다.

현재 프론트는 삭제된 URL 8곳과 제거된 추천 필드 `intimacy`, `mutualCount`를 사용한다. 이 때문에 네트워크·추천·라벨 그래프·프로필 trace가 런타임 404를 내고 TypeScript 오류 4건이 발생한다.

완료 조건:

- 삭제된 Social URL 참조가 0건이다.
- circleSize, 추천, 연결 경로, 라벨 네트워크, 공개 프로필, trace가 신규 URL로 동작한다.
- 추천 선택과 라벨 멤버 추가가 동일한 `/network/edges` 액션을 사용한다.
- edge 응답에서 target의 공통 친구 ID를 방향과 무관하게 안전하게 파생한다.
- 추천 DTO에 없는 intimacy/mutualCount를 서버 값처럼 가장하지 않는다.
- 빠른 추천 전환과 실패에서 기존 그래프 상태가 오염되지 않는다.

## 2. API 전환

| 액션 | 신규 계약 |
|---|---|
| `getFriendsNetworkAction` | `GET /api/v1/network?circleSize=` |
| `getTwoHopSuggestionsByAnchorAction` | `GET /api/v1/network/recommendations?anchorId=` |
| `getConnectionPathAction` | `GET /api/v1/network/path?targetId=` |
| `getLabelNetworkAction` | `GET /api/v1/network/labels/{labelId}` |
| `getNetworkEdgesAction` | `GET /api/v1/network/edges?targetId=&baseNetworkFriendIds=` |
| `getSocialProfileAction` | `GET /api/v1/social/profiles/{userId}` |
| `recordTraceAction` | `POST /api/v1/traces` |

`baseNetworkFriendIds`는 생성 클라이언트가 정의한 것처럼 쉼표 구분 문자열로 직렬화한다. 구현 초기의 실제 API smoke에서 백엔드 Spring binding을 확인하고, 실패하면 응답 근거를 보고 직렬화만 조정한다.

빈 base network에서는 edge API를 호출하지 않고 성공한 빈 결과로 처리한다.

## 3. edge 정규화 설계

`src/components/socialGraph/networkEdges.ts`에 API DTO를 UI에서 직접 가공하지 않는 순수 함수를 둔다.

```ts
deriveTargetNetworkEdges(
  targetId: number,
  baseNetworkFriendIds: number[],
  results: MutualFriendEdgeResult[],
): {
  mutualFriendIds: number[];
  edges: NetworkFriendEdge[];
}
```

규칙:

- `friendAId`, `friendBId`가 없는 항목 제거
- self-loop 제거
- target이 A/B 어느 쪽에 있어도 반대편을 추출
- target이 없는 edge 제거
- 반대편 ID가 base network에 없으면 제거
- 무방향 key `min-max`로 중복 제거
- intimacy가 없으면 그래프 edge 기본값 0 사용
- mutualFriendIds와 edges는 같은 필터 결과에서 만들어 서로 어긋나지 않게 한다.

이 함수는 추천 선택과 라벨 멤버 추가에서 공동 사용한다.

## 4. 추천 상태와 UI

### 추천 목록

`AnchorExpansionResult`의 `intimacy`, `mutualCount`, `labelCount` 참조를 모두 제거한다.

- 추천 노드는 `id`, `nickname`, `type`만 갖는다.
- anchor→suggestion edge에는 서버가 주지 않은 intimacy를 넣지 않는다.
- 추천 class의 기존 전용 스타일을 유지하고 일반 friend edge 물리값으로 오인하지 않게 한다.

### 추천 선택

`src/components/socialGraph/index.tsx`에 선택별 edge 상태를 둔다.

```ts
type SuggestionEdgesStatus = "idle" | "loading" | "success" | "error";
```

- 추천 선택 직후 기존 mutual IDs를 비우고 loading
- `/network/edges` 한 번 호출
- 성공 시 정규화된 mutual IDs를 그래프와 패널에 전달
- 실패 시 기존 친구 그래프는 유지하고 추천 부분 오류만 표시
- request sequence로 이전 추천 응답이 새 선택을 덮지 못하게 방어

`SuggestionPanel`은 `mutualCount: number | null`과 loading/error 상태를 prop으로 받는다.

- 조회 전·중에는 count 문구를 숨기거나 로딩 표시
- 성공 후에만 `공통 친구 N명` 표시
- 실패 시 재선택/재시도 가능한 오류 표시
- 추천 목록 각 항목에 선조회하는 N+1 호출은 하지 않는다.

## 5. 라벨 멤버 추가

Task 46의 `handleLabelMemberAdd`가 기존 one-hop API 대신 `getNetworkEdgesAction(friendId, currentNodeIds)`를 사용한다.

- 노드는 기존처럼 낙관적으로 추가
- 신규 edge 성공 시 정규화 후 중복 없이 병합
- edge 조회 실패가 라벨 멤버 추가 성공 자체를 롤백하지는 않는다. 멤버 관계와 시각화 edge는 별도 서버 동작이기 때문이다.
- Task 46의 label network/member 병렬 흐름은 유지하고 URL만 신규 계약으로 전환한다.

## 6. 생성·수정할 파일

| 파일 | 변경 |
|---|---|
| `src/app/actions/social.ts` | 단수 URL, 통합 `getNetworkEdgesAction`, 제거 액션 정리 |
| `src/app/actions/friendship.ts` | 연결 경로 URL 변경 |
| `src/components/socialGraph/networkEdges.ts` | target edge 정규화 순수 함수 |
| `src/components/socialGraph/networkEdges.test.ts` | 방향·중복·self-loop·base 밖 edge 검증 |
| `src/components/socialGraph/index.tsx` | 통합 edge 호출, 추천 요청 sequence와 상태 |
| `src/components/socialGraph/useGraphData.ts` | 제거된 추천 필드 참조 제거 |
| `src/components/SuggestionPanel/SuggestionPanel.tsx` | 파생 mutual count와 조회 상태 표시 |
| `src/components/SuggestionPanel/SuggestionPanel.test.tsx` | count 로딩·성공·실패 UI 검증 |

Mock 데이터 파일은 만들지 않는다. Server Action은 실제 백엔드 계약을 연동하고, 단위 테스트에서는 액션과 edge DTO만 최소 mock한다.

## 7. 작업 순서와 세이브 포인트

### Phase 1 — URL·edge 기반 (완료)

1. 모든 Social URL 교체
2. 통합 `getNetworkEdgesAction` 구현
3. edge 정규화 함수와 단위 테스트 작성
4. 제거된 추천 DTO 필드 참조 제거
5. Task 47 관련 TypeScript 오류 0건, 테스트 통과
6. 커밋: `feat(task-47): 신규 social network 계약을 연결한다`

### Phase 2 — 추천·라벨 UI 연결 (완료)

1. 추천 edge loading/success/error와 request sequence 구현
2. SuggestionPanel count 상태 UI와 테스트
3. 라벨 멤버 추가를 통합 edge 액션으로 전환
4. 실제 백엔드에서 circle, 추천, label network, profile, trace 검증
5. 스크린샷 저장
6. 커밋: `feat(task-47): 통합 edge 기반 추천 흐름을 연결한다`

### Phase 3 — 예외·회귀 (완료)

1. 빈 추천·빈 edge·잘못된 edge 검증
2. 빠른 추천 전환과 실패 상태 검증
3. Task 46 라벨 멤버 지연 조회 회귀 확인
4. 전체 테스트와 정적 분석 결과 기록
5. 커밋: `test(task-47): social network 예외와 회귀를 검증한다`

## 8. 테스트 계획

### Phase 1 — 정적·단위

- `rg '/api/v1/networks|/api/v1/social/users|/api/v1/social/traces' src` 결과 0건
- `rg 'suggestion\.(intimacy|mutualCount|labelCount)|s\.(intimacy|mutualCount|labelCount)' src` 결과 0건
- edge 함수:
  - target이 friendA인 경우
  - target이 friendB인 경우
  - target이 없는 edge
  - ID 누락, self-loop, base 밖 ID
  - 순서가 뒤집힌 중복 edge
  - 빈 base/빈 응답
- `npm test`
- `npx tsc --noEmit`
- `npm run lint`

OpenAPI 반영 후 생긴 unrelated `GetUserFlagsByRoleParams` barrel 오류와 기존 lint 기준선은 결과를 분리 기록한다. Task 47 파일의 오류를 숨기기 위해 Flag generated 파일이나 기존 lint 파일을 함께 수정하지 않는다.

### Phase 2 — 실제 UI·상태

이수환(user_id=4) 테스트 계정 사용.

- SUPPORT/SYMPATHY/KINSHIP/DUNBAR 네트워크 정상 표시
- 친구 anchor에서 추천 목록 표시
- 추천 선택 시 `/network/edges` 1회 호출과 공통 친구 edge/count 일치
- 추천 패널에서 로딩 중 가짜 `0명` 미표시
- 추천을 바꿨을 때 이전 edge 제거
- 라벨 `ku` 선택 시 network와 지연 조회 멤버 15명 결합
- 라벨 멤버 추가 시 신규 edge 병합
- 친구 `/users/70` 연결 경로와 trace 신규 URL 확인
- 비친구 공개 프로필 신규 URL 확인
- 스크린샷 `harness/verify/verify-47-*.png`

### Phase 3 — 예외

- 추천 0명은 기존 그래프를 유지하고 안내 toast
- edge 0개는 성공한 빈 결과
- edge 실패는 추천 패널 오류, 친구 그래프 유지
- A 추천 요청 중 B 추천 선택 시 A 응답 폐기
- label network 실패와 label member 실패를 서로 빈 상태로 오인하지 않음
- Task 46 라벨 count·멤버 캐시·프로필 바텀시트 유지

## 9. 제외 범위

- Friend request 통합 상태 전이: Task 48
- Flag generated barrel 오류 수정
- 연결 경로 `totalCount` 신규 UI
- 그래프 레이아웃 알고리즘 재설계
- 삭제된 추천 통계의 백엔드 재추가 요청

## 10. 브랜치

승인 후 Task 46 완료 커밋 `e9abc2a`에서 `agent/task-47-social-network-api-refactor`를 만든다. Task 47은 Task 46의 라벨 그래프 흐름 위에서 동작하므로 해당 커밋을 부모로 삼되, `main` 머지는 별도 사용자 요청 전에는 수행하지 않는다. Task 48 문서와 기존 사용자 변경은 커밋에서 제외한다.

## 11. 완료 결과

- `994918b` — 신규 Social URL, 통합 edge 액션, edge 정규화와 단위 테스트
- `9a4e1d8` — 추천 edge 상태·늦은 응답 차단, 그래프 밖 anchor 방어, 실제 UI 검증
- 전체 Vitest 4개 파일 16개 테스트 통과
- Task 47 변경 파일 ESLint 오류 0건
- 실제 백엔드에서 SUPPORT 네트워크, DJ 권대중 anchor 추천 4건, 정기완 선택의 공통 친구 1명, `ku` 라벨 멤버 15명 확인
- `harness/verify/verify-47-01-support-network.png`부터 `verify-47-04-label-network.png`까지 저장

전체 저장소 기준선에는 Task 47 외부의 lint 15건(오류 3, 경고 12)과 Flag 생성 코드의 `GetUserFlagsByRoleParams` 배럴 누락 TypeScript 오류 1건이 남아 있다. Task 47 범위를 넓히지 않기 위해 수정하지 않았다.

`/users/{id}` 실제 진입은 페이지 mount 시 방문 trace를 기록하므로 브라우저 자동 검증에서는 실행하지 않았다. 공개 프로필·연결 경로·trace는 코드의 신규 URL 전환과 제거 URL 0건으로 검증했다.
