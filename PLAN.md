# PLAN: Task 49 — Flag 목록·초대 API 계약 전환

상세 배경과 범위는 `harness/tasks/49-flag-api-contract-refactor.md`를 따른다.

## 상태

구현 완료. Phase 1 정적·단위 검증과 Phase 2 읽기 경로 실측을 마쳤고, 실제 초대 mutation은 테스트 Flag 생성 입력 제약으로 보류했다.

## 1. 요구사항 분석

최신 OpenAPI의 `flag-controller`와 `flag-invitation-controller`는 Flag 목록과 초대 조회 방식을 다음처럼 바꿨다.

- 내 Flag 목록은 `/flags/me` 배열 응답에서 `GET /flags?role=&page=&size=`의 `SliceFlagResult` 응답으로 바뀌었다.
- 친구 Flag는 `/flags/friends` 배열 응답에서 `GET /flags/feed?page=&size=`의 `SliceFlagResult` 응답으로 바뀌었다.
- 공개 프로필 Flag는 `/flags/recent?userId=`에서 `GET /flags/profile?userId=`로 바뀌었다.
- 받은/보낸 초대의 별도 URL·DTO가 `GET /flag-invitations?direction=`와 `FlagInvitationResult` 하나로 통합됐다.
- 초대 수락은 `POST .../accept`가 아니라 invitation ID 대상 `PATCH`와 `{ status: "ACCEPTED" }` 본문을 사용한다.

현재 `src/app/actions/flag.ts`와 목록·초대·공개 프로필 UI는 이전 URL, 배열 응답, 방향별 초대 DTO를 사용한다. 이 작업은 최신 계약에 맞춰 Server Action과 화면 상태를 함께 바꾼다.

완료 조건:

- 목록·feed가 Slice의 `content`, `number`, `last`를 안전하게 처리하고 페이지를 잃지 않는다.
- 공개 프로필의 Flag가 profile URL로 조회된다.
- 초대 탭이 `FlagInvitationResult.counterpartNickname`을 방향에 맞는 문구로 표시한다.
- 수락·거절·취소가 최신 계약에서 실제 허용된 mutation만 호출한다.
- 초기 조회·다음 페이지·mutation 실패가 기존 카드나 반대 탭을 빈 목록으로 바꾸지 않는다.

## 2. 계약 확정과 구현 전 확인

생성 코드의 최신 controller를 계약 기준으로 사용한다.

| 기능 | 최신 URL | 응답/요청 |
|---|---|---|
| 내 Flag | `GET /api/v1/flags?role=&page=&size=` | `SliceFlagResult` |
| feed | `GET /api/v1/flags/feed?page=&size=` | `SliceFlagResult` |
| 공개 프로필 Flag | `GET /api/v1/flags/profile?userId=` | `FlagResult[]` |
| 초대 목록 | `GET /api/v1/flag-invitations?direction=` | `FlagInvitationResult[]` |
| 초대 수락 | `PATCH /api/v1/flag-invitations/{invitationId}` | `{ status: "ACCEPTED" }` |
| 초대 삭제 | `DELETE /api/v1/flag-invitations/{invitationId}` | `void` |

구현 전에 실제 백엔드 또는 생성 타입으로 다음을 확정한다.

1. 초대 direction의 정확한 값.
2. 수신자가 DELETE로 거절할 수 있는지. 최신 status enum에는 `ACCEPTED`만 있으므로 REJECTED를 추측해 보내지 않는다.
3. `/flags/profile`의 정렬·최대 개수. 최근순이 보장되지 않으면 UI 문구를 "최근 Flag"에서 사실에 맞게 바꾼다.
4. Slice 기본·최대 size. UI 페이지 크기를 백엔드 제약에 맞춘다.

확인 결과:

- direction은 실제 백엔드에서 `RECEIVED`·`SENT` 두 값이 각각 정상 조회됨을 확인했다.
- Slice 기본 page는 `0`, 기본 size는 `20`이다.
- 상태 enum은 `ACCEPTED`만 노출한다. 거절은 별도 PATCH 상태가 없으므로 동일 invitation DELETE로 전환했다. 실제 수신자 DELETE 권한은 pending fixture가 있을 때 추가 확인한다.

## 3. Slice 목록 정규화

신규 `src/components/Flag/flagPage.ts`에 API Slice를 화면에서 안전하게 쓰기 위한 순수 함수를 둔다.

```ts
type FlagPage = {
  flags: FlagResult[];
  page: number;
  isLast: boolean;
};

toFlagPage(slice: SliceFlagResult, requestedPage: number): FlagPage
mergeFlagPages(current: FlagResult[], next: FlagResult[]): FlagResult[]
```

- `content`가 없으면 빈 배열, `number`가 없으면 요청 page, `last`가 없으면 마지막 페이지로 처리한다.
- 다음 페이지는 ID 중복 없이 현재 카드 뒤에 병합한다.
- 탭별 상태는 목록, 현재 page, 마지막 여부, 초기 로딩, 다음 페이지 로딩, failure를 독립적으로 둔다.
- 다음 페이지 실패는 이미 성공한 카드와 마지막 성공 page를 유지한다.

## 4. Server Action 전환 — `src/app/actions/flag.ts`

- `getHostingFlagsAction(page?, size?)`, `getParticipatingFlagsAction(page?, size?)`를 `/flags?role=HOST|PARTICIPANT&page=&size=`로 바꾸고 `FlagPage` 또는 raw Slice를 반환한다.
- `getFeedFlagsAction(page?, size?)`를 `/flags/feed`으로 도입한다. `getFriendFlagsAction`은 삭제하거나 호환 wrapper로만 남긴다.
- `getUserProfileFlagsAction(userId)`를 `/flags/profile?userId=`로 만든다. 최근성을 보장하지 않는 새 계약에 맞춰 `getUserRecentFlagsAction` 이름은 제거한다.
- `getFlagInvitationsAction(direction)`를 도입한다. 받은/보낸 wrapper가 있더라도 공통 action을 통해 query를 구성한다.
- `acceptInvitationAction(invitationId)`는 PATCH와 `{ status: "ACCEPTED" }`를 사용한다.
- 거절 action은 DELETE가 수신자에게 허용된다는 계약 확인 뒤에만 DELETE로 전환한다. 허용되지 않으면 UI에서 거절 action을 숨기거나 백엔드 결정을 요청한다.
- 기존처럼 모든 catch에서 redirect error를 재throw하고, 목록 조회 실패는 `toFailure`로 정규화한다.

## 5. UI 전환

### Flag 목록

`src/app/flags/page.tsx`, `src/components/Flag/FlagList.tsx`

- 호스팅·참여 첫 페이지를 `Promise.all`로 병렬 조회한다.
- 각 탭에서 다음 페이지가 있을 때만 "더 보기"를 보인다.
- feed는 탭 최초 진입 때 첫 페이지를 불러오고, 더 보기와 재시도를 독립적으로 처리한다.
- 빈 Slice, 초기 로딩, 다음 페이지 로딩, failure를 구별한다.

### 공개 프로필

`src/components/UserProfile/PublicProfile.tsx`

- profile Flag action으로 바꾸고, 백엔드 정렬 보장에 따라 섹션 문구를 정정한다.

### Flag 초대

`src/app/flags/invitations/page.tsx`, `src/components/Flag/FlagInvitationTabs.tsx`, `src/components/Flag/FlagInvitationList.tsx`

- `ReceivedFlagInvitationResult`, `SentFlagInvitationResult`를 `FlagInvitationResult`로 통일한다.
- 받은 탭은 `counterpartNickname`을 "{이름}님이 초대했어요", 보낸 탭은 "{이름}님에게 보낸 초대"로 렌더링한다.
- 수락·거절·취소 성공 시 해당 invitation ID 카드만 제거한다.
- 실패 시 카드·탭 상태를 유지하고 오류를 해당 카드에 표시한다.

## 6. 생성·수정 파일

| 파일 | 변경 |
|---|---|
| `src/app/actions/flag.ts` | 최신 목록·profile·초대 query, PATCH 수락 계약 |
| `src/app/flags/page.tsx` | 호스팅/참여 Slice 초기 조회 |
| `src/components/Flag/FlagList.tsx` | 탭별 Slice 상태와 더 보기 |
| `src/components/Flag/flagPage.ts` | 신규 Slice 정규화·병합 순수 함수 |
| `src/components/Flag/flagPage.test.ts` | 신규 Slice 정규화 단위 테스트 |
| `src/components/UserProfile/PublicProfile.tsx` | profile Flag action 및 문구 |
| `src/app/flags/invitations/page.tsx` | direction별 통합 조회 |
| `src/components/Flag/FlagInvitationTabs.tsx` | 공통 DTO와 방향별 UI |
| `src/components/Flag/FlagInvitationList.tsx` | PATCH 수락·거절 계약 |
| 초대 컴포넌트 테스트 | 방향별 문구, action 성공·실패 상태 |

Mock 파일은 만들지 않는다. 실제 API 계약은 Server Action으로 연결하고, Slice·초대 UI의 순수 상태만 최소 단위 테스트한다.

## 7. 단계별 작업·검증

### Phase 1 — 계약·정적·단위

1. 최신 Flag controller의 URL·DTO·direction/거절 계약을 확정한다.
2. `flagPage.ts`와 단위 테스트를 작성한다.
3. Server Action을 Slice·profile·통합 초대·PATCH 수락으로 전환한다.
4. 이전 목록·초대 URL(`flags/me`, `flags/friends`, `flags/recent`, `flag-invitations/received|sent|accept|reject`)의 잔존 여부를 확인한다.
5. `npm run lint`, `npx tsc --noEmit`, 관련 Vitest를 실행한다.
6. 통과 시 Phase 1 세이브포인트 커밋을 만든다.

### Phase 2 — UI·상태

1. 이수환 계정에서 호스팅·참여·feed 각 첫 페이지를 확인한다.
2. 다음 페이지가 있는 탭에서 더 보기가 중복 없이 카드를 추가하는지 확인한다.
3. 공개 프로필 Flag가 profile URL로 표시되는지 확인한다.
4. 받은/보낸 초대가 counterpart 이름을 올바른 문구로 표시하는지 확인한다.
5. pending 초대의 수락·거절·취소를 확정된 계약으로 실행해 해당 카드만 제거되는지 확인한다.
6. `harness/verify/verify-49-*.png`에 화면을 저장한다.
7. 통과 시 Phase 2 세이브포인트 커밋을 만든다.

### Phase 3 — 예외·회귀

1. 빈 Slice와 마지막 페이지의 Empty State·더 보기 비노출을 확인한다.
2. 초기/다음 페이지 실패가 기존 카드나 반대 탭을 지우지 않는지 확인한다.
3. 초대 mutation 실패 시 카드를 유지하고 오류를 표시하는지 확인한다.
4. Flag 생성·상세·참여·탈퇴·댓글·메모리얼이 회귀하지 않았는지 확인한다.
5. 통과 시 최종 커밋과 결과 기록을 만든다.

## 8. 현재 검증 결과

- 전체 Vitest 26개가 통과했고, 신규 Slice 정규화 단위 테스트 4개를 추가했다.
- Task 49 대상 ESLint 오류는 없다.
- 이전 목록·초대 경로 문자열은 `src/app/actions/flag.ts`에서 제거했다.
- 실제 백엔드에서 초대 `RECEIVED`·`SENT` 조회가 각각 정상 렌더링되고, `/flags`와 `/flags/feed` Slice 조회의 Empty State가 정상 표시됨을 확인했다.
- `verify-49-01-sent-invitations-empty.png`, `verify-49-02-feed-empty.png`을 저장했다.
- `npx tsc --noEmit`은 기존 stale generated `flag-query-controller`의 `GetUserFlagsByRoleParams` export 누락 1건으로 실패한다. Task 49 변경 파일 오류는 없다.
- 초대 mutation을 위한 테스트 Flag 생성은 브라우저 자동화가 `datetime-local` 값을 React 입력 상태에 반영하지 못해 실행하지 못했다. Flag 또는 초대를 새로 만들지 않았고, 기존 데이터는 변경하지 않았다.

## 9. 제외 범위

- Flag 생성·상세·참여·탈퇴·수정·모집 마감의 API 설계 변경
- 댓글·메모리얼 API의 재작업
- Flag 카드 디자인 전면 개편, 무한 스크롤·새 검색/정렬 UI
- stale generated OpenAPI 파일 또는 생성기 설정 수정

## 10. 브랜치

승인 후 `main`의 `531f727`을 기준으로 `agent/task-49-flag-api-contract-refactor` 브랜치를 만들고 구현한다. main 머지와 push는 별도 사용자 요청 전에는 수행하지 않는다.
