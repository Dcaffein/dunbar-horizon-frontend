# Task 48: Friend request 통합 조회와 counterpart 상태 전이

## 상태

완료 (2026-08-29). 통합 조회·counterpartId 상태 전이를 구현하고, 실제 pending 요청으로 수락·숨기기·취소까지 검증했다.

## 배경

받은 요청과 보낸 요청의 별도 endpoint가 하나의 목록 API로 통합됐다. 수락과 숨김도 개별 action endpoint 대신 counterpart 사용자 ID를 대상으로 하는 PATCH 상태 전이로 바뀌었다. 취소 역시 request UUID가 아니라 counterpartId를 받는다.

## API 변경표

| 기능 | 기존 | 신규 |
|---|---|---|
| 받은 요청 | `GET /friend-requests` | `GET /friend-requests?direction=RECEIVED&status=PENDING` |
| 보낸 요청 | `GET /friend-requests/sent` | `GET /friend-requests?direction=SENT` (`status` 미지원) |
| 수락 | `POST /friend-requests/{requestId}/accept` | `PATCH /friend-requests/{counterpartId}` `{ status: "ACCEPTED" }` |
| 숨기기 | `POST /friend-requests/{requestId}/hide` | `PATCH /friend-requests/{counterpartId}` `{ status: "HIDDEN" }` |
| 취소 | `DELETE /friend-requests/{requestId}` | `DELETE /friend-requests/{counterpartId}` |

생성과 응답 DTO는 유지된다.

```ts
POST /api/v1/friend-requests
{ receiverId: number }
→ FriendRequestResult
```

신규 생성 타입 기준:

```ts
type GetRequestsParams = {
  direction: string;
  status?: "PENDING" | "ACCEPTED" | "HIDDEN";
};

type FriendRequestStatusUpdateRequest = {
  status: "PENDING" | "ACCEPTED" | "HIDDEN";
};
```

## 목표

- 받은/보낸 목록을 신규 query 계약으로 조회한다.
- 수락·숨김을 하나의 상태 변경 액션으로 통합한다.
- 모든 mutation 대상 식별자를 requestId에서 counterpartId로 전환한다.
- UI key로 쓰는 request UUID와 서버 mutation 식별자를 명확히 분리한다.
- 상태 변경 실패 시 목록을 유지하고 재시도할 수 있게 한다.

## 설계

### Server Action

`src/app/actions/friendRequest.ts`

- 공통 `getFriendRequestsAction(direction, status?)` 도입. RECEIVED 목록에만 `PENDING`을 명시하고, SENT 목록은 `status`를 생략한다.
- 필요하면 화면 의미를 드러내는 `getReceivedRequestsAction`, `getSentRequestsAction` wrapper는 유지
- `updateFriendRequestStatusAction(counterpartId, status)` 도입
- 수락과 숨김 wrapper를 유지한다면 내부적으로 공통 PATCH 호출
- `cancelFriendRequestAction(counterpartId: number)`로 변경
- query는 `URLSearchParams`로 구성
- redirect error 재throw와 기존 failure 정규화 규칙 유지

액션 인자에 `requestId`라는 이름을 남기지 않는다. DOM key용 `request.id`와 서버 대상인 상대 사용자 ID가 다른 개념임을 타입으로 드러낸다.

### counterpartId 계산

`FriendRequestResult`에는 `requester`, `receiver`가 모두 존재한다.

- 받은 요청의 counterpart: `requester.id`
- 보낸 요청의 counterpart: `receiver.id`

mutation 호출 직전에 방향별로 계산하거나, 목록을 UI 모델로 정규화할 때 `counterpartId`를 만든다. ID가 없는 불완전한 응답은 action 버튼을 비활성화하고 잘못된 `0`을 전송하지 않는다.

### 요청 페이지 초기 조회

`src/app/requests/page.tsx`

- 받은/보낸 PENDING 목록을 `Promise.all`로 병렬 조회
- 한쪽 실패를 다른 쪽 빈 목록으로 위장하지 않음
- 탭별 성공·실패 상태를 `FriendRequestPage`에 전달

### Client 상태

`src/components/FriendRequest/useFriendRequest.ts`

- `actionLoadingId`는 UUID string 대신 방향과 counterpartId가 충돌하지 않는 키 사용
- accept/hide/cancel handler는 `counterpartId: number` 수신
- 성공 후 로컬 제거는 `request.id` 또는 counterpartId를 명확히 사용
- 동일 상대에 대한 중복 mutation 방지
- 요청 전송 성공 시 반환 DTO를 보낸 목록에 추가하되 receiver ID 누락 시 재조회 전략 사용
- `isAlreadySent`는 기존처럼 `receiver.id` 기준 유지

`src/components/FriendRequest/FriendRequestPage.tsx`

- 버튼 handler에 request UUID가 아닌 counterpartId 전달
- 받은 카드에서는 requester, 보낸 카드에서는 receiver를 상대방으로 표시
- counterpartId 누락 시 버튼 비활성화 및 안전한 오류 상태 표시

## 수정 예상 파일

| 파일 | 변경 |
|---|---|
| `src/app/actions/friendRequest.ts` | 통합 목록·PATCH 상태 액션·counterpartId 취소 |
| `src/app/requests/page.tsx` | direction/status 기반 병렬 초기 조회 |
| `src/components/FriendRequest/useFriendRequest.ts` | mutation 식별자와 로컬 상태 변경 |
| `src/components/FriendRequest/FriendRequestPage.tsx` | 방향별 counterpart 전달과 탭 실패 UI |

비친구 프로필과 추천 패널의 `sendFriendRequestAction(receiverId)`는 생성 API가 유지되므로 회귀 확인만 한다.

## 백엔드 계약 확인

- `direction` 허용값은 정확히 무엇인가? 생성 타입이 enum이 아니라 `string`이라 OpenAPI만으로 확정할 수 없다.
- `status`를 생략했을 때 전체 상태인가, PENDING 기본값인가?
- counterpartId 기준 PATCH/DELETE는 로그인 사용자의 요청 방향을 어떻게 판별하는가?
- 같은 상대와 과거 ACCEPTED/HIDDEN 요청이 있어도 현재 PENDING 요청만 변경하는가?
- `HIDDEN`에서 `PENDING`으로 복구하는 기능을 프론트에 노출해야 하는가?
- mutation 성공 응답은 계속 `void`이며 최신 목록 재조회가 필요 없는가?

`direction` 값은 구현을 시작하기 전 반드시 확인한다. 문자열을 추측해 배포하지 않는다.

## 제외 범위

- 친구 관계 자체의 PATCH/DELETE (`/friends/{friendId}`)
- 추천 API와 추천 노드: Task 47
- 숨긴 요청 전용 관리 화면 신규 제작
- ACCEPTED/HIDDEN 히스토리 UI 신규 제작

## 검증

### Phase 1 — 정적 분석·단위 검증

- `rg '/sent|/accept|/hide' src/app/actions/friendRequest.ts`로 삭제 URL 잔존 여부 확인
- mutation 함수 인자에 `requestId`가 남지 않았는지 확인
- `npm run lint`
- `npx tsc --noEmit`
- 방향별 counterpart 계산 단위 테스트:
  - received → requester.id
  - sent → receiver.id
  - ID 누락
- accept/hide/cancel 성공·실패 시 로컬 목록 변화 테스트

### Phase 2 — UI·상태

fixtures의 이수환(user_id=4)과 실제 요청 상대를 사용한다.

- 받은/보낸 PENDING 목록이 각 탭에 정확히 표시
- 이메일 검색 후 요청 전송, 보낸 목록 즉시 반영
- 받은 요청 수락 후 카드 제거 및 메인 친구 목록 반영
- 받은 요청 숨김 후 받은 탭에서 제거
- 보낸 요청 취소 후 보낸 탭에서 제거
- mutation 네트워크 요청 path가 counterpartId인지 확인
- 스크린샷은 `harness/verify/verify-48-*.png`로 저장

### Phase 3 — 예외

- 받은/보낸 요청 0건
- 한쪽 탭 조회만 실패했을 때 다른 탭은 정상 유지
- requester/receiver ID가 없는 응답에서 mutation 호출 차단
- accept/hide/cancel 연속 클릭 시 중복 요청 차단
- mutation 409/404 시 카드 유지와 실패 사유 표시
- 이미 보낸 상대에게 재전송 차단
- 자기 자신, 기존 친구, 존재하지 않는 사용자 요청 오류가 기존 failure 정책으로 표시
- 수락 직후 친구 목록 이동 시 최신 데이터 확인

각 Phase 통과 후 저장소 정책에 따라 세이브 포인트 커밋을 만든다.

## 완료 검증 결과

- 전체 Vitest 22개가 통과했고, 방향별 counterpart 계산 단위 테스트 6개를 추가했다.
- Task 48 대상 ESLint 오류는 없었다. `npx tsc --noEmit`은 범위 밖 생성 코드의 기존 `GetUserFlagsByRoleParams` barrel 오류 1건으로만 실패했다.
- 실제 계정으로 정기완 → 이수환 pending 요청을 생성해 이수환의 **숨기기** 후 받은 목록에서 카드가 제거됨을 확인했다.
- 실제 계정으로 이진혁 → 이수환 pending 요청을 생성해 이수환의 **수락** 후 카드가 제거됨을 확인하고, 이진혁 계정에서 친구 삭제로 관계를 원복했다.
- 이진혁 → 이수환 pending 요청을 다시 생성해 보낸 목록에 표시되는 것을 확인한 뒤 **취소**하여 목록에서 제거됨을 확인했다.
- 받은/보낸 요청 0건 Empty State도 실제 화면에서 확인했다. 스크린샷은 `harness/verify/verify-48-*.png`에 저장했다.

숨기기는 서버에 `HIDDEN` 이력을 남기며, 보낸 목록에서는 조회되지 않는다. 이는 상태 전이 계약에 따른 동작이고 친구 관계는 생성하지 않는다.

## 브랜치

`agent/task-48-friend-request-api-refactor`
