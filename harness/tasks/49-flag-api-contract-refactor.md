# Task 49: Flag 목록·초대 API 계약 전환

## 상태

구현 완료. 최신 query·Slice·초대 상태 전이를 반영했고, 정적·읽기 경로 검증을 마쳤다. 실제 초대 mutation은 pending fixture가 준비될 때 추가 검증한다.

## 배경

Flag API가 query 전용 controller와 기존의 분리된 초대 endpoint를 정리했다. 현재 프론트의 `src/app/actions/flag.ts`는 삭제되었거나 응답 형태가 바뀐 경로를 계속 호출하고 있어, Flag 목록·공개 프로필의 Flag·Flag 초대 화면이 404 또는 DTO 불일치 상태가 된다.

생성 코드에는 이전 `flag-query-controller`도 남아 있지만, 최신 계약은 `flag-controller`와 `flag-invitation-controller`다. 작업 구현은 이 최신 controller의 URL·DTO를 정답으로 삼고, stale generated controller는 직접 수정하지 않는다.

## API 변경표

| 기능 | 기존 프론트 호출 | 신규 OpenAPI 계약 | 영향 |
|---|---|---|---|
| 내 호스팅/참여 Flag | `GET /flags/me?role=HOST\|PARTICIPANT` → `FlagResult[]` | `GET /flags?role=&page=&size=` → `SliceFlagResult` | Flag 목록의 두 탭과 페이지 상태 |
| 친구 Flag 둘러보기 | `GET /flags/friends` → `FlagResult[]` | `GET /flags/feed?page=&size=` → `SliceFlagResult` | 둘러보기 탭과 더 보기 |
| 공개 프로필 Flag | `GET /flags/recent?userId=` | `GET /flags/profile?userId=` → `FlagResult[]` | `PublicProfile`의 Flag 목록 |
| 받은/보낸 초대 | `GET /flag-invitations/received\|sent` + 방향별 DTO | `GET /flag-invitations?direction=` → `FlagInvitationResult[]` | 초대 탭 DTO와 상대 이름 표시 |
| 초대 수락 | `POST /flag-invitations/{id}/accept` | `PATCH /flag-invitations/{id}` `{ status: "ACCEPTED" }` | 받은 초대 수락 |
| 초대 거절 | `POST /flag-invitations/{id}/reject` | 최신 명세에 별도 REJECTED 상태 없음 | DELETE의 수신자 거절 허용 여부 확인 필요 |
| 보낸 초대 취소 | `DELETE /flag-invitations/{id}` | `DELETE /flag-invitations/{id}` | 경로 유지, 통합 DTO와 함께 회귀 확인 |

변경되지 않은 Flag 생성·상세·참여·탈퇴·수정·댓글·메모리얼 API는 회귀 확인만 한다.

## 목표

- 모든 Flag 목록이 최신 query URL과 `SliceFlagResult.content`를 사용한다.
- Slice의 `last`, `number`, `empty`를 보존해 첫 페이지에서 목록을 잘라 보이는 일이 없도록 페이지 이동 또는 더 보기 UX를 제공한다.
- 공개 프로필의 Flag 조회를 `/flags/profile?userId=`로 전환한다.
- 초대 조회를 direction 기반 공통 action으로 통합하고, `FlagInvitationResult.counterpartNickname`을 탭 방향에 맞게 표시한다.
- 초대 수락을 counterpart 상태가 아닌 invitation ID 대상 PATCH 상태 전이로 바꾼다.
- 초대 거절의 최신 백엔드 계약을 확인한 뒤, 삭제 또는 별도 상태 전이 중 실제 허용된 동작만 노출한다.
- 실패 시 기존 목록을 빈 목록으로 덮어쓰지 않고, 탭·페이지별 재시도가 가능하다.

## 설계

### 1. 목록 Slice 정규화

`src/components/Flag/`에 `FlagPage` 또는 동등한 순수 정규화 헬퍼를 둔다.

```ts
type FlagPage = {
  flags: FlagResult[];
  page: number;
  isLast: boolean;
};
```

- `SliceFlagResult.content ?? []`, `number ?? requestedPage`, `last ?? true`로 UI 모델을 만든다.
- 내 Flag(호스팅/참여)와 feed는 모두 `page`, `size`를 action 인자로 받는다.
- 탭별 page·loading·failure를 독립 관리한다. 더 보기 성공 시 ID 중복 없이 뒤에 병합하고, 실패 시 이미 보이던 카드와 페이지 번호를 유지한다.
- 현재처럼 기본 탭 전환 때 첫 페이지를 매번 빈 배열로 덮어쓰지 않는다.

### 2. Server Action

`src/app/actions/flag.ts`

- `getHostingFlagsAction(page?, size?)`, `getParticipatingFlagsAction(page?, size?)` → `GET /api/v1/flags?role=HOST|PARTICIPANT&page=&size=`.
- `getFeedFlagsAction(page?, size?)` → `GET /api/v1/flags/feed?page=&size=`. 기존 `getFriendFlagsAction` 명칭은 제거하거나 feed 의미가 드러나는 wrapper로만 유지한다.
- `getUserProfileFlagsAction(userId)` → `GET /api/v1/flags/profile?userId=`. 기존 `getUserRecentFlagsAction`은 최근성 보장이 사라졌으므로 이름을 바꾼다.
- `getFlagInvitationsAction(direction)` → `GET /api/v1/flag-invitations?direction=...`.
  - 화면 의미를 드러내는 `getReceivedInvitationsAction`, `getSentInvitationsAction` wrapper는 유지할 수 있다.
  - `direction`의 실제 enum 값은 구현 전 생성 타입과 백엔드로 확정한다. 문자열을 추측하지 않는다.
- `acceptInvitationAction(invitationId)` → `PATCH /api/v1/flag-invitations/{invitationId}` `{ status: "ACCEPTED" }`.
- 거절은 OpenAPI에서 `ACCEPTED`만 상태 enum으로 노출되므로 `DELETE`가 수신자에게도 허용되는지 실제 계약으로 확인한 뒤 action을 결정한다. 허용되지 않으면 거절 버튼을 제거하거나 백엔드 계약 보완을 요청한다.
- 모든 action은 `isRedirectError` 재throw와 `toFailure` 기반 실패 정규화를 유지한다.

### 3. Flag 목록 UI

`src/app/flags/page.tsx`, `src/components/Flag/FlagList.tsx`

- 서버 초기 조회는 호스팅·참여 첫 페이지를 병렬로 가져온다.
- 각 탭은 Slice 메타데이터와 함께 렌더링한다. 다음 페이지가 있을 때만 `더 보기`를 노출한다.
- feed는 최초 탭 진입 시 첫 페이지를 조회하고 이후 더 보기를 지원한다. 초기 로드, 다음 페이지 로드, 실패 상태를 구분한다.
- 목록이 비었는지(`flags.length === 0`)와 다음 페이지를 불러오는 중인지가 섞이지 않게 한다.

### 4. 공개 프로필 UI

`src/components/UserProfile/PublicProfile.tsx`

- `getUserRecentFlagsAction`을 `getUserProfileFlagsAction`으로 교체한다.
- 최신 API가 전체 프로필 Flag를 반환하므로 UI 문구가 "최근 Flag"라는 약속을 유지할 수 있는지 확인한다. 정렬 보장이 없다면 "참여한 Flag" 등 사실에 맞는 문구로 바꾼다.

### 5. Flag 초대 UI

`src/app/flags/invitations/page.tsx`, `src/components/Flag/FlagInvitationTabs.tsx`, `src/components/Flag/FlagInvitationList.tsx`

- `ReceivedFlagInvitationResult`, `SentFlagInvitationResult` 대신 `FlagInvitationResult` 하나를 사용한다.
- 받은 탭: `counterpartNickname`을 "{이름}님이 초대했어요"로 표시한다.
- 보낸 탭: 같은 필드를 "{이름}님에게 보낸 초대"로 표시한다.
- 수락/거절/취소 성공 후에는 해당 invitation ID 카드만 제거한다. 실패 때는 목록을 유지하고 오류를 카드에 표시한다.
- 수락 화면 이동과 취소·거절의 빈 상태를 회귀 확인한다.

## 수정 예상 파일

| 파일 | 변경 |
|---|---|
| `src/app/actions/flag.ts` | Slice 목록·profile·통합 초대 조회·PATCH 수락 계약 전환 |
| `src/app/flags/page.tsx` | 호스팅/참여 첫 Slice 병렬 조회와 실패 전달 |
| `src/components/Flag/FlagList.tsx` | 탭별 Slice 상태·더 보기·feed action 전환 |
| `src/components/Flag/flagPage.ts` | (신규) Slice → UI 페이지 순수 정규화 |
| `src/components/Flag/flagPage.test.ts` | (신규) Slice 빈값·다음 페이지·중복 병합 단위 검증 |
| `src/components/UserProfile/PublicProfile.tsx` | profile Flag action·문구 정정 |
| `src/app/flags/invitations/page.tsx` | 방향별 통합 초대 조회와 탭별 실패 전달 |
| `src/components/Flag/FlagInvitationTabs.tsx` | 공통 invitation DTO·방향별 상대 표시 |
| `src/components/Flag/FlagInvitationList.tsx` | 공통 DTO·PATCH 수락·거절 계약 반영 |
| 초대 컴포넌트 테스트 | (신규/수정) direction별 문구와 성공·실패 상태 검증 |

Mock 파일은 만들지 않는다. Server Action이 실제 백엔드 계약을 호출하고, 순수 Slice 정규화 및 컴포넌트 상태만 최소 단위 테스트한다.

## 백엔드 계약 확인 필요

1. invitation `direction`의 정확한 허용값 (`RECEIVED`/`SENT` 등).
2. 수신자가 `DELETE /flag-invitations/{id}`로 거절할 수 있는지, 또는 별도 거절 API가 있는지.
3. `GET /flags/profile`의 정렬·최대 개수 보장. 최근 항목이 아니라면 프로필 문구를 변경한다.
4. Slice 기본 `size`와 최대 size. 화면의 기본 페이지 크기를 이에 맞춘다.
5. `GET /flags?role=`가 HOST와 PARTICIPANT 외 역할을 허용하는지.

확인된 계약:

- `direction=RECEIVED`와 `direction=SENT`는 실제 백엔드 조회에서 모두 성공했다.
- Slice 기본 page는 0, 기본 size는 20이다.
- 초대 PATCH status enum은 `ACCEPTED`만 노출한다. 거절은 별도 status가 아닌 invitation DELETE로 구현했다. 수신자 DELETE 권한은 pending fixture로 추가 확인한다.

## 제외 범위

- Flag 생성·상세·참여·탈퇴·수정·모집 마감 API의 재설계
- Flag 댓글·메모리얼 API 변경
- Flag 카드의 디자인 전면 개편
- 무한 스크롤, 정렬·검색·필터 조건을 새로 설계하는 작업
- stale generated OpenAPI 파일 직접 수정 또는 생성기 설정 변경

## 검증

### Phase 1 — 정적 분석·단위

- 이전 목록/초대 경로(`flags/me`, `flags/friends`, `flags/recent`, `flag-invitations/received|sent|accept|reject`)가 Server Action에 남지 않았는지 확인한다.
- Slice 정규화: content 누락, 빈 Slice, 마지막 페이지, 중복 ID 병합을 단위 테스트한다.
- 초대의 받은/보낸 방향별 counterpart 문구와 PATCH 수락 payload를 테스트한다.
- `npm run lint`, `npx tsc --noEmit`, 관련 Vitest를 실행한다.

### Phase 2 — UI·상태

- 이수환 계정에서 호스팅·참여·feed 첫 페이지를 각 탭에 표시한다.
- 다음 페이지가 있는 목록에서 더 보기를 눌러 카드가 중복 없이 추가되는지 확인한다.
- 공개 프로필의 Flag 목록을 신규 profile URL로 확인한다.
- 받은/보낸 Flag 초대가 각 탭에서 counterpart 이름과 함께 표시되는지 확인한다.
- pending 초대를 수락하고, 거절·취소가 확정된 계약대로 목록에서 제거되는지 확인한다.
- 스크린샷을 `harness/verify/verify-49-*.png`로 저장한다.

### Phase 3 — 예외·회귀

- Slice 응답이 빈 경우 Empty State를 표시한다.
- 초기 조회 또는 다음 페이지 조회 실패가 기존 카드와 반대 탭을 지우지 않는다.
- 수락·거절·취소 실패 시 해당 카드를 유지하고 오류를 표시한다.
- 마지막 페이지에서 더 보기 버튼이 사라진다.
- Flag 생성·상세·참여·탈퇴·댓글·메모리얼의 기존 경로가 회귀하지 않았는지 확인한다.

## 현재 검증 결과

- 전체 Vitest 26개 통과, 신규 Slice 정규화 테스트 4개 통과.
- Task 49 대상 ESLint 오류 없음. `npx tsc --noEmit`은 범위 밖 stale generated `flag-query-controller`의 `GetUserFlagsByRoleParams` export 누락 1건으로만 실패.
- 실제 백엔드에서 통합 초대 RECEIVED/SENT 조회와 Flag 목록·feed Slice Empty State를 확인했다.
- `harness/verify/verify-49-01-sent-invitations-empty.png`, `harness/verify/verify-49-02-feed-empty.png` 저장.
- `datetime-local` 값을 자동화 환경에서 React 상태로 입력할 수 없어 테스트 Flag를 만들지 못했다. 따라서 수락·거절·취소 mutation의 런타임 확인은 pending fixture가 마련될 때 수행하며, 검증 중 실제 데이터를 만들거나 변경하지 않았다.

## 브랜치

승인 후 `main`의 Task 48 머지 커밋을 기준으로 `agent/task-49-flag-api-contract-refactor` 브랜치를 만든다. 구현 전 브랜치 루트의 `PLAN.md`를 이 task에 맞게 갱신하고 사용자 승인을 받는다.
