# PLAN: Task 48 — Friend request 통합 조회와 counterpart 상태 전이

배경과 계약은 `harness/tasks/48-friend-request-api-refactor.md`를 따른다.

## 상태

완료 (2026-08-29). Phase 1(정적·단위) 통과·커밋. Phase 2에서 목록 계약을 실제 백엔드로 검증하고 SENT/status 계약 버그를 수정했다. 이후 실제 pending 요청을 생성해 counterpartId 기반 PATCH 수락·숨기기와 DELETE 취소의 화면 상태 전이까지 검증했다.

## 완료 결과

- `6e64909` — 통합 조회·PATCH 상태 전이·counterpartId 취소·deriveCounterpartId 단위 테스트·탭별 실패 UI.
- `43228c9` — **실측 계약 수정**: `GET /friend-requests?direction=SENT&status=...`는 400(`FriendRequestInvalidException: "sent 조회에는 status를 사용할 수 없습니다."`). RECEIVED만 status 필터를 지원하므로 status를 선택 인자로 바꾸고 SENT는 생략. 실제 백엔드에서 받은/보낸 탭이 각각 200 빈 목록으로 정상 표시됨을 확인.
- 실제 pending 요청 검증: 정기완 → 이수환 요청의 HIDDEN 전이, 이진혁 → 이수환 요청의 ACCEPTED 전이, 이진혁 → 이수환 요청의 DELETE 취소가 각각 해당 탭의 카드 제거로 반영됐다. 수락으로 생긴 친구 관계는 이후 친구 삭제로 원복했다.
- 삭제 URL(`/sent`, `/accept`, `/hide`, UUID DELETE) 0건, 서버 액션 시그니처 `requestId` 0건.
- 전체 Vitest 22개 통과(신규 counterpart 6개 포함), Task 48 파일 tsc/lint 오류 0건.
- 기존 기준선(Flag generated `GetUserFlagsByRoleParams` barrel TS 오류 1건, Task 47 외 lint)은 범위 밖으로 미수정.

### direction 확정값

- `RECEIVED` / `SENT` (사용자 확인 + 실측). RECEIVED는 `status=PENDING` 지원, SENT는 status 미지원.

## 0. 백엔드 계약 확정 (사용자 확인 완료)

- `direction` 허용값: **`RECEIVED` / `SENT`** (받은/보낸).
- RECEIVED 조회는 `status=PENDING`을 지원한다. SENT 조회에 `status`를 보내면 400이므로 생략한다. SENT 응답은 실제 화면에서 pending 요청만 반환됨을 확인했다.
- 나머지 계약은 생성 코드 `src/api/generated/friend-request-controller/friend-request-controller.ts`로 확정:
  - `GET /api/v1/friend-requests?direction=&status=` → `FriendRequestResult[]`
  - `PATCH /api/v1/friend-requests/{counterpartId}` `{ status }` → `void` (수락·숨김 통합)
  - `DELETE /api/v1/friend-requests/{counterpartId}` → `void` (취소)
  - `POST /api/v1/friend-requests` `{ receiverId }` → `FriendRequestResult` (생성, 유지)

## 1. 요구사항 분석

기존 프론트는 삭제된 URL을 사용한다:

- `GET /api/v1/friend-requests/sent` (보낸 목록 전용)
- `POST /api/v1/friend-requests/{requestId}/accept`
- `POST /api/v1/friend-requests/{requestId}/hide`
- `DELETE /api/v1/friend-requests/{requestId}` (UUID 기반)

또한 모든 mutation이 `request.id`(UUID string)를 서버 대상 식별자로 사용한다. 신규 계약은 mutation 대상이 **상대 사용자 ID(number)** 이므로 UUID를 그대로 넘기면 잘못된 대상에 요청한다.

완료 조건:

- 삭제된 URL(`/sent`, `/accept`, `/hide`, UUID DELETE) 참조 0건.
- 받은/보낸 PENDING 목록이 신규 query 계약으로 조회된다.
- 수락·숨김이 하나의 PATCH 상태 전이 액션으로 통합된다.
- 모든 mutation 대상이 `counterpartId: number`로 전환된다.
- DOM key용 `request.id`(UUID)와 서버 대상 `counterpartId`가 타입·명칭으로 분리된다.
- counterpartId를 안전하게 파생할 수 없는 응답은 버튼을 비활성화하고 `0`을 전송하지 않는다.
- 한쪽 탭 조회 실패가 다른 탭 빈 목록으로 위장되지 않는다.
- 상태 변경 실패 시 카드가 유지되고 재시도 가능하다.

## 2. counterpartId 파생 규칙

`FriendRequestResult`에는 `requester`, `receiver`가 모두 있다(`FriendResult { id?, nickname? }`).

- 받은 요청(RECEIVED)의 counterpart = `requester.id`
- 보낸 요청(SENT)의 counterpart = `receiver.id`

목록을 UI 모델로 정규화할 때 방향별 `counterpartId`와 표시용 상대(nickname)를 함께 계산한다. `id`가 없으면 `counterpartId = null`로 두어 버튼을 비활성화한다.

## 3. Server Action — `src/app/actions/friendRequest.ts`

- 공통 조회
  ```ts
  type FriendRequestDirection = "RECEIVED" | "SENT";
  type FriendRequestStatus = "PENDING" | "ACCEPTED" | "HIDDEN";

  getFriendRequestsAction(
    direction: FriendRequestDirection,
    status?: FriendRequestStatus,
  )
  ```
  - query는 `URLSearchParams`로 구성: `direction`, 필요할 때만 `status`.
- 화면 의미용 wrapper 유지: `getReceivedRequestsAction()` = `("RECEIVED", "PENDING")`, `getSentRequestsAction()` = `("SENT")`.
- 상태 전이 통합
  ```ts
  updateFriendRequestStatusAction(counterpartId: number, status: FriendRequestStatus)
  ```
  - `PATCH /api/v1/friend-requests/{counterpartId}` body `{ status }`.
  - wrapper `acceptFriendRequestAction(counterpartId)` = `(id, "ACCEPTED")`, `hideFriendRequestAction(counterpartId)` = `(id, "HIDDEN")`. 인자명은 `requestId`가 아닌 `counterpartId: number`.
- 취소 `cancelFriendRequestAction(counterpartId: number)` → `DELETE /api/v1/friend-requests/{counterpartId}`.
- 생성 `sendFriendRequestAction(receiverId)`, 검색 `searchUserByEmailAction`은 유지(회귀 확인만).
- 모든 액션은 기존처럼 `isRedirectError(error)` 재throw + `{ success, data|message }` 정규화 유지.

액션 시그니처 어디에도 `requestId` 이름을 남기지 않는다.

## 4. 요청 페이지 초기 조회 — `src/app/requests/page.tsx`

- 받은/보낸 PENDING 목록을 `Promise.all`로 병렬 조회(각각 `getReceivedRequestsAction`, `getSentRequestsAction`).
- 한쪽 실패를 빈 배열로 위장하지 않는다. 탭별 `{ data, ok }` 형태로 `FriendRequestPage`에 전달한다.
  - `initialReceived: { data: FriendRequestResult[]; ok: boolean }`, `initialSent` 동일.
- redirect error는 상위로 throw.

## 5. Client 상태 — `src/components/FriendRequest/useFriendRequest.ts`

- 목록을 UI 모델로 정규화하는 순수 헬퍼를 컴포넌트 폴더에 둔다: `src/components/FriendRequest/counterpart.ts`
  ```ts
  deriveCounterpartId(request: FriendRequestResult, direction: FriendRequestDirection): number | null
  ```
  - RECEIVED → `requester?.id ?? null`, SENT → `receiver?.id ?? null`.
- `actionLoadingId`는 방향과 counterpartId가 충돌하지 않는 키(`"RECEIVED:{id}"` / `"SENT:{id}"`) 사용. 동일 상대 중복 mutation 방지도 이 키로.
- accept/hide/cancel handler는 `counterpartId: number`를 받는다. 로컬 제거는 방향별로 `request.id`(UUID) 기준 필터 — DOM 아이덴티티와 서버 식별자를 명확히 구분.
  - accept/hide → received 목록에서 해당 카드 제거.
  - cancel → sent 목록에서 해당 카드 제거.
- 요청 전송 성공 시 반환 DTO를 sent 목록에 추가하되, `data.receiver?.id`가 없으면 낙관적 추가 대신 `getSentRequestsAction()` 재조회로 정합성 확보.
- `isAlreadySent(userId)`는 기존처럼 `sentRequests.some(r => r.receiver?.id === userId)` 유지.
- 실패 시 목록 불변 + `actionError` 표시(재시도 가능).

## 6. UI — `src/components/FriendRequest/FriendRequestPage.tsx`

- `ReceivedTab`/`SentTab`은 각 카드에서 방향별 `counterpartId`를 계산해 handler에 **UUID가 아닌 counterpartId**를 전달.
- 받은 카드는 `requester`, 보낸 카드는 `receiver`를 상대방으로 표시(기존과 동일 유지).
- `counterpartId == null`이면 액션 버튼 비활성화 + 안전한 오류 문구 표시(잘못된 `0` 미전송).
- 탭별 조회 실패(`ok === false`)면 해당 탭에 실패/재시도 안내, 반대 탭은 정상 유지.
- 로딩 중(`actionLoadingId === key`) 버튼 비활성화로 연속 클릭 차단(기존 disabled 로직을 새 키에 맞춰 유지).

## 7. 생성·수정할 파일

| 파일 | 변경 |
|---|---|
| `src/app/actions/friendRequest.ts` | 통합 목록(direction/status)·PATCH 상태 전이·counterpartId 취소 |
| `src/app/requests/page.tsx` | direction=RECEIVED/SENT, status=PENDING 병렬 초기 조회, 탭별 ok 전달 |
| `src/components/FriendRequest/counterpart.ts` | (신규) 방향별 counterpartId 파생 순수 함수 |
| `src/components/FriendRequest/counterpart.test.ts` | (신규) received→requester.id, sent→receiver.id, ID 누락 검증 |
| `src/components/FriendRequest/useFriendRequest.ts` | mutation 식별자 전환, 방향별 로딩 키, 중복 차단, 로컬 상태 변경 |
| `src/components/FriendRequest/FriendRequestPage.tsx` | 방향별 counterpart 전달, 탭 실패 UI, 버튼 비활성화 |

Mock 파일은 만들지 않는다. 단위 테스트는 counterpart 파생 함수만 최소 검증한다(테스트 러너는 기존 Vitest 사용).

## 8. 작업 순서와 세이브 포인트

### Phase 1 — 액션·순수 함수·정적 검증

1. `friendRequest.ts` 신규 계약으로 전환(목록/PATCH/DELETE).
2. `counterpart.ts` 파생 함수 + 단위 테스트.
3. `page.tsx`·`useFriendRequest.ts`·`FriendRequestPage.tsx` mutation 식별자/조회 전환.
4. `rg '/sent|/accept|/hide' src/app/actions/friendRequest.ts` 0건, mutation 인자에 `requestId` 0건.
5. `npm run lint`(Task 48 파일 오류 0건), `npx tsc --noEmit`(Task 48 파일 오류 0건).
6. `npm test`(counterpart 테스트 통과).
7. 커밋: `refactor(task-48): friend request 통합 조회와 counterpart 상태 전이`

### Phase 2 — 실제 UI·상태 검증

이수환(user_id=4) 계정 기준.

1. 받은/보낸 PENDING 목록과 각 Empty State를 실제 화면에서 확인했다.
2. 이메일 검색 → 요청 전송 → 보낸 목록 표시를 확인했다.
3. 받은 요청 수락 → 카드 제거를 확인하고, 생성된 친구 관계는 친구 삭제로 원복했다.
4. 받은 요청 숨김 → 받은 탭 제거를 확인했다.
5. 보낸 요청 취소 → 보낸 탭 제거를 확인했다.
6. Server Action의 mutation 대상이 `counterpartId: number`인 것을 정적·단위 검증하고, 실제 전이 결과로 확인했다.
7. 스크린샷 `harness/verify/verify-48-*.png` 저장.
8. 최종 커밋에 검증 결과를 포함한다.

### Phase 3 — 예외·회귀

1. 받은/보낸 0건.
2. 한쪽 탭 조회만 실패 → 반대 탭 정상.
3. requester/receiver ID 없는 응답 → mutation 차단(버튼 비활성).
4. accept/hide/cancel 연속 클릭 중복 차단.
5. mutation 409/404 → 카드 유지 + 실패 사유 표시.
6. 이미 보낸 상대 재전송 차단(`isAlreadySent`).
7. 비친구 프로필/추천 패널 `sendFriendRequestAction(receiverId)` 회귀 확인(생성 API 유지).
8. 커밋: `test(task-48): 예외와 회귀를 검증한다`

## 9. 테스트 계획 (harness/TESTING_RULES.md 3단계)

- Phase 1(정적·단위): 삭제 URL 0건, `requestId` 인자 0건, lint/tsc/test.
- Phase 2(UI·상태): 위 8항목, network path counterpartId 확인, 스크린샷.
- Phase 3(예외): 위 8항목.

기존 저장소 기준선 오류(Task 47 기록의 lint 15건 + Flag generated `GetUserFlagsByRoleParams` barrel TS 오류 1건)는 Task 48 범위를 넓히지 않기 위해 건드리지 않고 결과를 분리 기록한다.

## 10. 제외 범위

- 친구 관계 자체 PATCH/DELETE (`/friends/{friendId}`).
- 추천 API/추천 노드(Task 47).
- 숨긴 요청 전용 관리 화면, ACCEPTED/HIDDEN 히스토리 UI 신규 제작.
- `HIDDEN→PENDING` 복구 UI 노출.

## 11. 브랜치

승인 후 `main`(현재 `119b4fc`, Task 47 머지)에서 `agent/task-48-friend-request-api-refactor`를 만든다. `main` 머지와 push는 별도 사용자 요청 전에는 수행하지 않는다. Task 48 문서/기존 워킹트리 변경은 커밋에서 분리한다.
