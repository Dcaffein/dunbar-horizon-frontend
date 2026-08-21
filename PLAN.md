# PLAN: Task 41 — Flag 도메인 백엔드 URL 리팩토링 대응

작업 배경·목적·범위 근거는 `harness/tasks/41-flag-api-url-refactor.md` 참고.
이 문서는 **구현 절차와 검증**을 다룬다.

## 1. 변경 성격별 분류

```
① URL만 교체 (4곳)         → 런타임에서만 깨짐. tsc가 못 잡는다 ★ 수동 대조 필수
② flagId 인자 추가 (5+5)   → tsc가 호출부 누락을 전부 잡아준다
③ 문구 처리 (2+3곳)        → 덮어쓰기 제거 + 입력 가드
```

작업 위험은 ①에 몰려 있다. 문자열 교체라 타입 검사가 도와주지 않으므로
Phase 1의 grep과 Phase 2의 네트워크 탭 대조로 이중 확인한다.

## 2. 생성/수정할 파일

| 파일 | 변경 |
|---|---|
| `src/app/actions/flag.ts` | URL 4곳, 시그니처 5곳, 덮어쓰기 제거 2곳 |
| `src/components/Flag/FlagComments.tsx` | 호출부 3곳 `flagId` 전달, 입력 3곳 500자 가드 |
| `src/components/Flag/FlagMemorial.tsx` | 호출부 2곳 `flagId` 전달 |

**무변경 확인 완료** — `FriendProfile.tsx`, `PublicProfile.tsx`는 `/flags/recent` 계약이
인자를 바꾸지 않으므로 손대지 않는다.

Mock 파일은 만들지 않는다. 신규 UI 컴포넌트가 없고 기존 배선 교체이므로
`harness/fixtures/`의 실제 계정으로 검증한다.

## 3. 구현 단계

### 1단계 — URL 교체 4곳 (`flag.ts`)

| 위치 | 액션 | 변경 |
|---|---|---|
| [flag.ts:37](src/app/actions/flag.ts#L37) | `getUserRecentFlagsAction` | `` `/api/v1/flags/users/${userId}/recent` `` → `/api/v1/flags/recent` + `params: { userId }` |
| [flag.ts:109](src/app/actions/flag.ts#L109) | `leaveAction` | `` `.../flags/${id}/participants` `` → `` `.../flags/${id}/participants/me` `` |
| [flag.ts:217](src/app/actions/flag.ts#L217) | `updateInvitePermissionAction` | `` `.../participants/${participantId}/invite-permission` `` → `` `.../participants/${participantId}` `` |
| [flag.ts:119](src/app/actions/flag.ts#L119) | `inviteFriendAction` | 아래 참조 |

**초대 생성** — 시그니처는 그대로 두고 `flagId`만 경로에서 본문으로 옮긴다.

```ts
// before
await apiClient.post(`/api/v1/flags/${flagId}/invitations`, { inviteeId });
// after
await apiClient.post("/api/v1/flag-invitations", { flagId, inviteeId });
```

**최근 Flag** — 쿼리 문자열을 직접 조립하지 말고 `apiClient`의 `options.params`를 쓴다.
`{ silent: true }`는 유지한다. 프로필 진입 시 실패해도 조용히 빈 목록으로 떨어지는
현재 동작이 의도된 것이다.

```ts
const data = await apiClient.get<FlagResult[]>("/api/v1/flags/recent", {
  params: { userId },
  silent: true,
});
```

`participateAction`(POST `/participants`)은 **건드리지 않는다.** `me`는 DELETE에만 붙었다.

### 2단계 — flagId 인자 추가 (5 + 5)

`flag.ts`의 시그니처를 먼저 전부 바꾸고 `npx tsc --noEmit`을 돌려 호출부를 찾는다.
컴파일 에러가 곧 작업 목록이 된다.

| 위치 | 변경 후 |
|---|---|
| [flag.ts:258](src/app/actions/flag.ts#L258) | `updateMemorialAction(flagId, id, content)` → `` `/api/v1/flags/${flagId}/memorials/${id}` `` |
| [flag.ts:269](src/app/actions/flag.ts#L269) | `deleteMemorialAction(flagId, id)` → 동일 경로 |
| [flag.ts:303](src/app/actions/flag.ts#L303) | `createReplyAction(flagId, parentId, content, isPrivate?)` → `` `/api/v1/flags/${flagId}/comments/${parentId}/replies` `` |
| [flag.ts:317](src/app/actions/flag.ts#L317) | `updateCommentAction(flagId, commentId, content)` → `` `/api/v1/flags/${flagId}/comments/${commentId}` `` |
| [flag.ts:328](src/app/actions/flag.ts#L328) | `deleteCommentAction(flagId, commentId)` → 동일 경로 |

호출부 5곳. 두 컴포넌트 모두 이미 `flagId: number`를 prop으로 받고 있고
(`FlagMemorial` 32행, `FlagComments` 135행), 아래 호출은 전부 그 함수 본문 안에 있다.

| 파일 | 위치 | 변경 |
|---|---|---|
| [FlagMemorial.tsx:82](src/components/Flag/FlagMemorial.tsx#L82) | 82 | `updateMemorialAction(flagId, id, editText.trim())` |
| [FlagMemorial.tsx:94](src/components/Flag/FlagMemorial.tsx#L94) | 94 | `deleteMemorialAction(flagId, id)` |
| [FlagComments.tsx:171](src/components/Flag/FlagComments.tsx#L171) | 171 | `createReplyAction(flagId, parentId, content, ...)` |
| [FlagComments.tsx:195](src/components/Flag/FlagComments.tsx#L195) | 195 | `updateCommentAction(flagId, commentId, editText.trim())` |
| [FlagComments.tsx:205](src/components/Flag/FlagComments.tsx#L205) | 205 | `deleteCommentAction(flagId, commentId)` |

인자 순서가 [buzz.ts:87](src/app/actions/buzz.ts#L87)의
`updateCommentAction(buzzId, commentId, ...)`와 같아져 두 도메인이 일관된다.
이름이 겹치지만 모듈이 달라 서로 영향이 없다.

### 3단계 — 고정 문구 덮어쓰기 제거 2곳

```ts
// leaveAction — flag.ts:113
- return { success: false as const, message: "참여 취소에 실패했습니다." };
+ const message = error instanceof Error ? error.message : "참여 취소에 실패했습니다.";
+ return { success: false as const, message };
```

`acceptInvitationAction`([flag.ts:134](src/app/actions/flag.ts#L134))도 동일하게 고친다.
`isRedirectError(error)` 재던지기는 **그대로 둔다.**

같은 파일의 다른 액션 11곳이 이미 이 형태이므로 파일 내부 일관성이 오히려 좋아진다.
컴포넌트는 변경 없다 — 이미 `result.message ?? "기본 문구"`로 받고 있다.

### 4단계 — 댓글 500자 입력 가드 (`FlagComments.tsx`)

입력 3곳에 `maxLength={500}`을 걸고, 450자를 넘으면 잔여 글자수를 표시한다.

| 위치 | 대상 |
|---|---|
| [FlagComments.tsx:299](src/components/Flag/FlagComments.tsx#L299) | 댓글 작성 |
| [FlagComments.tsx:258](src/components/Flag/FlagComments.tsx#L258) | 대댓글 작성 |
| [FlagComments.tsx:77](src/components/Flag/FlagComments.tsx#L77) | 댓글 수정 |

`CommentCreateRequest`·`CommentUpdateRequest`의 `@maxLength 500`과 값을 일치시킨다.
서버 검증을 대체하는 것이 아니라 400을 드물게 만드는 목적이다.

## 4. 테스트 시나리오 (`harness/TESTING_RULES.md`)

### Phase 1 — 정적 분석

- `npx tsc --noEmit` — 2단계 호출부 누락은 여기서 전부 잡힌다
- `npm run lint`
- 구 경로 잔존 확인 → **0건이어야 한다**

```bash
grep -rn "api/v1/comments\|api/v1/flags/memorials\|flags/users\|invite-permission" src/app src/components
```

- 통과 시 1차 커밋 (`test(phase1): 정적 분석 통과`)

### Phase 2 — UI / State

기준 계정: 이수환 / leesuhwan@test.com / String123! (user_id=4)

깨져 있던 9개 흐름의 복구 확인이 목적이다.
**개발자 도구 네트워크 탭에서 실제 요청 URL을 매번 대조한다** — ①은 tsc가 못 잡는다.

| 시나리오 | 확인할 요청 | 상태 확인 |
|---|---|---|
| 댓글 작성 → 대댓글 → 수정 → 삭제 | `flags/{flagId}/comments/...` | 낙관적 트리 갱신 유지 |
| 메모리얼 작성 → 수정 → 삭제 | `flags/{flagId}/memorials/{id}` | 목록 즉시 반영 |
| 참여 취소 | `DELETE .../participants/me` | 참여자 목록에서 즉시 제거 |
| 친구 초대 | `POST /flag-invitations` + 본문 `flagId` | 토스트 "초대가 전송되었습니다" |
| 초대 권한 토글 | `PATCH .../participants/{pid}` | 토글 상태 유지 |
| 최근 Flag | `GET /flags/recent?userId=` | 주최·참여 혼재, **최대 5건**.<br>**FriendProfile·PublicProfile 양쪽** 모두 확인 |

마지막 항목은 두 컴포넌트가 동일 구조라는 프로젝트 원칙에 따라 반드시 양쪽을 본다.

스크린샷 → `harness/verify/verify-41-{stepNo}-{description}.png`
통과 시 2차 커밋

### Phase 3 — Edge Case

| 케이스 | 기대 |
|---|---|
| 댓글 501자 입력 | 입력창이 500자에서 막힘 |
| 댓글 정확히 500자 | 정상 등록 (off-by-one) |
| 마감된 Flag 탈퇴 | 409 → **백엔드가 준 사유 문구**. 참여자 목록이 낙관적으로 지워지지 않음 |
| 만료된 초대 수락 | 409 → 카드에 사유 표시, 화면 이동 없음 |
| 토큰 만료 상태에서 액션 | `redirect("/login")` 정상 동작 |

마감 Flag 탈퇴에서 백엔드 문구가 뭉뚱그린 문장이면
**Task 42 이후 status 분기 대상으로 기록**하고 이번엔 넘어간다.

통과 시 최종 커밋. **push는 하지 않는다.**

## 5. 리스크

| 리스크 | 대응 |
|---|---|
| ① URL 교체를 tsc가 못 잡음 | Phase 1 grep 0건 + Phase 2 네트워크 탭 대조 |
| 3단계로 백엔드 문구 노출 범위가 넓어짐 | 4xx 문구는 표시용 한국어로 실측 확인됨. 5xx·네트워크 실패 문구 살균은 **Task 42** 담당 |
| `fetch failed` 노출 경로가 남음 | 이번 작업이 만든 문제가 아니다(기존 18곳 동일). Task 42에서 일괄 해결 |
| 백엔드 배포 시점 불일치 | 구 경로는 이미 삭제됨. FE 반영이 늦을수록 장애가 길어지므로 선반영이 맞다 |

## 6. 브랜치

승인 후 `agent/task-41-flag-api-url-refactor` 브랜치를 생성해 작업한다.
Phase별로 커밋해 롤백 지점을 남긴다.
