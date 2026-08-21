# Task 41: Flag 도메인 백엔드 URL 리팩토링 대응

> 구현 계획·파일별 변경·검증 절차는 `PLAN.md` 참고.
> 이 문서는 **무엇이 왜 바뀌었고 프론트가 어디까지 대응하는가**를 다룬다.

## 배경

백엔드가 Flag 도메인 REST 경로를 리소스 계층 규칙에 맞게 정리했다(28커밋).
개별 URL이 임의로 바뀐 게 아니라 세 가지 규칙이 적용된 결과다.

| 규칙 | 내용 |
|---|---|
| **중첩 리소스 정규화** | 댓글·메모리얼은 Flag에 종속된 리소스다. 평평한 루트(`/api/v1/comments/{id}`)에서 소유 리소스 밑(`/api/v1/flags/{flagId}/comments/{id}`)으로 이동 |
| **컬렉션 vs 서브리소스 구분** | "내 참여"는 컬렉션이 아니라 특정 서브리소스다. `DELETE /participants` → `DELETE /participants/me`. 권한 변경도 `invite-permission` 동사형 경로를 없애고 참여자 리소스 자체를 `PATCH` |
| **초대 리소스 독립** | 초대는 Flag의 하위가 아니라 자체 생명주기를 갖는 리소스다. `POST /flags/{flagId}/invitations` → `POST /flag-invitations`, `flagId`는 경로에서 **본문**으로 |

## 목적

**깨진 9개 흐름의 복구.**

구 경로는 이미 삭제됐다. `/v3/api-docs` 실측 결과 `/api/v1/comments/**`,
`/api/v1/flags/memorials/**`, `/flags/users/{id}/recent`, `DELETE /participants`,
`invite-permission`이 모두 존재하지 않는다. 현재 프론트에서 아래가 전부 404다.

```
댓글    대댓글 · 수정 · 삭제
메모리얼 수정 · 삭제
참여 취소 / 친구 초대 / 초대 권한 변경 / 프로필의 최근 Flag
```

Orval 클라이언트(`src/api/generated/`)는 재생성되어 신규 경로를 반영하고 있으나,
**프론트 런타임은 generated를 전혀 import하지 않는다.** 실제 호출은 전부
`src/app/actions/flag.ts`가 하드코딩한 URL 문자열이므로 generated 갱신만으로는 아무것도 고쳐지지 않는다.
generated는 이 태스크에서 **경로 계약의 정답지**로만 쓴다.

## 백엔드 계약 변화

응답 DTO는 무변경이다. 바뀐 요청 DTO는 `CommentCreateRequest`, `CommentUpdateRequest`,
`FlagInviteRequest` 3개뿐이다.

### A. 경로만 바뀐 것

| 대상 | 이전 | 이후 |
|---|---|---|
| 유저의 최근 Flag | `GET /api/v1/flags/users/{userId}/recent` | `GET /api/v1/flags/recent?userId=` |
| 내 참여 취소 | `DELETE /api/v1/flags/{id}/participants` | `DELETE /api/v1/flags/{id}/participants/me` |
| 초대 권한 변경 | `PATCH .../participants/{pid}/invite-permission` | `PATCH .../participants/{pid}` |
| 초대 생성 | `POST /api/v1/flags/{flagId}/invitations`<br>body `{ inviteeId }` | `POST /api/v1/flag-invitations`<br>body `{ flagId, inviteeId }` |

초대 생성은 경로와 본문이 함께 바뀐다. `FlagInviteRequest`에 `@NotNull Long flagId`가
추가되어 누락 시 400이다.

**참여(POST `/participants`)는 변경 없다.** `me`가 붙은 것은 DELETE뿐이다.

### B. 소유 리소스 밑으로 중첩된 것

| 대상 | 이전 | 이후 |
|---|---|---|
| 메모리얼 수정·삭제 | `/api/v1/flags/memorials/{id}` | `/api/v1/flags/{flagId}/memorials/{id}` |
| 대댓글 작성 | `/api/v1/comments/{parentId}/replies` | `/api/v1/flags/{flagId}/comments/{parentId}/replies` |
| 댓글 수정·삭제 | `/api/v1/comments/{commentId}` | `/api/v1/flags/{flagId}/comments/{commentId}` |

경로에 `flagId`가 생겼으므로 **해당 Server Action 5개의 시그니처가 바뀐다.**
호출하는 컴포넌트는 이미 `flagId`를 prop으로 갖고 있어 배관을 새로 뚫을 필요는 없다.

### C. 응답이 바뀐 것

| 상황 | 이전 | 이후 |
|---|---|---|
| 댓글 501자 이상 | 500 | 400 + `validation` 맵 (`@Size(max=500)` 추가) |
| 모집 종료 후 탈퇴 | 500 | **409** |
| 만료된 초대 수락 | 409 | 409 유지, `error` 필드가 `FlagDeadlinePassedException`으로 변경 |

## `/flags/recent` 계약 확정 경위

최초 전달 명세는 `?userId=&sort=recent`였으나 `/v3/api-docs`에는 `sort`가 없고
`role`이 `required: true`로 나와 있었다. 확인 결과 **구현 오류가 아니라 문서 생성 한계**였다.
`GET /api/v1/flags` 한 경로에 핸들러 두 개가 쿼리 조건으로 매달려 있었고,
OpenAPI에는 "이 파라미터가 있을 때만 이 오퍼레이션"이라는 표현이 없어
springdoc이 둘을 한 오퍼레이션으로 합치면서 성립하지 않는 조합을 노출했다.

백엔드가 경로를 분리했고, 재실측으로 확인했다.

```
GET /api/v1/flags        | getUserFlagsByRole   - userId, role(HOST|PARTICIPANT) 둘 다 required
GET /api/v1/flags/recent | getRecentFlags       - userId만
```

`sort`는 폐기다. `recent`는 정렬 옵션이 아니라 **주최 + 참여 합집합을 최신순 5개**로 주는
별개 조회이며, 구 `/flags/users/{userId}/recent`와 백엔드 내부적으로 동일한 조회다.
따라서 **화면 의미 변화가 없고 호출부도 무변경**이다.

`role`을 HOST/PARTICIPANT 2회 호출해 병합하는 우회는 **채택하지 않는다.**
5개 제한이 풀려 결과가 달라진다.

## 범위 — C를 최소로 다루는 이유

**분기는 UI가 실제로 다르게 행동해야 할 때만 만든다.**
C 3건에서 실패 시 화면이 하는 일을 확인했다.

| 상황 | 실패 시 화면이 하는 일 | 판별자 필요? |
|---|---|---|
| 댓글 400 | `setError(...)` | ✗ |
| 탈퇴 409 | [FlagDetail.tsx:134](src/components/Flag/FlagDetail.tsx#L134) `setActionError(...)`<br>참여자 목록 제거는 `if (result.success)` 안에서만 | ✗ |
| 초대 수락 409 | [FlagInvitationList.tsx:35](src/components/Flag/FlagInvitationList.tsx#L35) `setError(...)`<br>화면 이동은 성공 시에만 | ✗ |

**셋 다 하는 일이 "문구 띄우기" 하나다.** 그리고 백엔드는 이미 표시용 한국어 문장을 준다
(실측: `{"error":"UnAuthorizedException","message":"인증되지 않은 사용자입니다."}`).

따라서 status를 알 필요가 없다. 지금 문제는 오히려
[flag.ts:113](src/app/actions/flag.ts#L113)·[flag.ts:134](src/app/actions/flag.ts#L134)가
백엔드 메시지를 받아놓고 `"참여 취소에 실패했습니다."` 같은 고정 문구로 **덮어쓰는 것**이다.
사용자는 왜 실패했는지 알 수 없다. **덮어쓰기를 멈추는 것으로 충분하다.**

댓글 400은 `maxLength={500}` 입력 가드를 넣으면 애초에 거의 발생하지 않는다.
`validation` 필드를 꺼내 쓰는 것은 "입력값이 올바르지 않습니다" → "500자 이내로…" 정도의
구체성 차이뿐이므로 제외한다.

### 포함

1. A의 경로 4곳 교체 + 초대 본문에 `flagId`
2. B의 시그니처 5곳 + 호출부 5곳에 `flagId` 전달
3. 고정 문구 덮어쓰기 제거 — `leaveAction`, `acceptInvitationAction`
4. 댓글 입력 3곳에 500자 가드

### 제외

| 항목 | 이유 |
|---|---|
| `apiClient` 실패 정규화 / `ApiError` | **Task 42.** 영향 범위가 앱 전체(49 호출부)라 분리 |
| 409 재조회 동작 | 409는 본래 "내 화면이 낡았다"는 뜻이라 문구보다 재조회가 먼저다. 그러려면 `status`가 필요하고 Task 42가 선행돼야 한다 |
| `validation` 필드 바인딩 | 위와 동일 |
| `src/api/generated/` 정리 | 삭제된 컨트롤러 잔재가 남아 있으나 어디서도 import되지 않아 런타임 무해. 배포 후 `npx orval` 재생성으로 처리 |
| 메모리얼 길이 제한 | 이번 DTO 변경 대상이 아니다 |
| Buzz 도메인 | 경로 변경 없음 |

## 완료 기준

- 위 9개 흐름이 정상 동작하고, 각 요청이 신규 경로로 나간다
- 프론트 코드에 구 경로 문자열이 남아 있지 않다
- 탈퇴·초대 수락 실패 시 **백엔드가 준 사유**가 화면에 뜬다
- 댓글이 500자에서 입력이 막힌다

## 선행 조건

없다. **Task 42에 의존하지 않는다.**
오히려 이 태스크를 먼저 끝내야 Task 42의 전 도메인 회귀 스모크에서 Flag를 검증할 수 있다.

## 후속

Task 42 완료 후 재검토할 항목:

- 탈퇴 409 → 문구만이 아니라 **참여자 목록 재조회**
- 백엔드 409 문구가 뭉뚱그린 문장이면 `status` 기반 문구 분기
- 댓글 400의 `validation.content`를 입력 아래 바인딩

## Result

_미착수_
