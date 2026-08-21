# Task 41: Flag 도메인 백엔드 URL 리팩토링 대응

> 구현 절차·파일별 변경·검증 방법은 `PLAN.md` 참고.

## 배경

백엔드가 Flag REST 경로를 리소스 계층 규칙에 맞게 정리했다(28커밋). 규칙은 셋이다.

1. **중첩 정규화** — 댓글·메모리얼은 Flag 종속 리소스다. `/api/v1/comments/{id}` → `/api/v1/flags/{flagId}/comments/{id}`
2. **컬렉션 vs 서브리소스** — "내 참여"는 서브리소스다. `DELETE /participants` → `/participants/me`.
   권한 변경도 동사형 경로(`invite-permission`)를 없애고 참여자 리소스 자체를 `PATCH`
3. **초대 리소스 독립** — 초대는 자체 생명주기를 갖는다. `POST /flags/{id}/invitations` → `POST /flag-invitations` (`flagId`가 본문으로)

## 목적

**깨진 9개 흐름의 복구.** 구 경로는 이미 삭제되어 아래가 전부 404다.

```
댓글 대댓글·수정·삭제 / 메모리얼 수정·삭제
참여 취소 / 친구 초대 / 초대 권한 변경 / 프로필의 최근 Flag
```

Orval 클라이언트는 재생성됐지만 **런타임은 generated를 import하지 않는다.** 실제 호출은
`src/app/actions/flag.ts`의 하드코딩 URL이므로 generated 갱신만으로는 아무것도 고쳐지지 않는다.
generated는 경로 계약의 정답지로만 쓴다.

## 계약 변화

응답 DTO는 무변경. 바뀐 요청 DTO는 `CommentCreateRequest`, `CommentUpdateRequest`, `FlagInviteRequest` 셋뿐이다.

| 대상 | 이전 → 이후 |
|---|---|
| 최근 Flag | `/flags/users/{userId}/recent` → `/flags/recent?userId=` |
| 참여 취소 | `DELETE /flags/{id}/participants` → `.../participants/me` |
| 초대 권한 | `PATCH .../participants/{pid}/invite-permission` → `.../participants/{pid}` |
| 초대 생성 | `POST /flags/{id}/invitations` `{inviteeId}` → `POST /flag-invitations` `{flagId, inviteeId}` |
| 메모리얼 수정·삭제 | `/flags/memorials/{id}` → `/flags/{flagId}/memorials/{id}` |
| 대댓글·댓글 수정·삭제 | `/comments/**` → `/flags/{flagId}/comments/**` |

중첩된 뒤쪽 두 줄은 경로에 `flagId`가 생기므로 **Server Action 5개의 시그니처가 바뀐다.**
호출 컴포넌트는 이미 `flagId`를 prop으로 갖고 있어 배관 추가는 없다.
참여(POST `/participants`)는 변경 없다 — `me`는 DELETE에만 붙었다.

**응답 변화 3건**: 댓글 501자 `500 → 400`, 모집 종료 후 탈퇴 `500 → 409`,
만료된 초대 수락은 409 유지하되 `error`가 `FlagDeadlinePassedException`으로 변경.

### `/flags/recent` — 명세와 문서가 어긋났던 건

최초 명세는 `?userId=&sort=recent`였는데 api-docs에는 `sort`가 없고 `role`이 required로 보였다.
원인은 한 경로에 핸들러 두 개가 쿼리 조건으로 매달려 있어 springdoc이 둘을 한 오퍼레이션으로
합친 것. 백엔드가 경로를 분리했고 `sort`는 폐기됐다.

`/recent`는 정렬 옵션이 아니라 **주최 + 참여 합집합을 최신순 5개**로 주는 별개 조회이며,
구 경로와 내부적으로 같은 조회다. 따라서 화면 의미 변화도 호출부 변경도 없다.
`role`을 2회 호출해 병합하는 우회는 **쓰면 안 된다** — 5개 제한이 풀려 결과가 달라진다.

## 범위

### C(응답 변화)를 최소로 다루는 이유

**분기는 UI가 실제로 다르게 행동해야 할 때만 만든다.** 3건 모두 실패 시 하는 일이
`setError(...)` 하나뿐이고, 낙관적 업데이트와 화면 이동은 전부 성공 분기 안에서만 일어난다.
그리고 백엔드는 이미 표시용 한국어 문장을 준다.

따라서 status 분기 없이 **덮어쓰기를 멈추는 것으로 충분하다.**
지금은 `leaveAction`·`acceptInvitationAction`이 백엔드 사유를 받아놓고
`"참여 취소에 실패했습니다."` 같은 고정 문구로 덮어써서 사용자가 이유를 알 수 없다.

### 포함

URL 4곳 교체 · 시그니처 5곳 + 호출부 5곳에 `flagId` · 덮어쓰기 제거 2곳 · 댓글 500자 입력 가드

### 제외

| 항목 | 이유 |
|---|---|
| `apiClient` 실패 정규화 / `ApiError` | **Task 42.** 영향 범위가 앱 전체(49 호출부)라 분리 |
| 409 재조회 동작 | 409는 "내 화면이 낡았다"는 뜻이라 문구보다 재조회가 먼저다. `status`가 필요하므로 Task 42 이후 |
| `validation` 필드 바인딩 | 위와 동일 |
| generated 정리 / 메모리얼 길이 제한 / Buzz | 런타임 무해 · 이번 DTO 대상 아님 · 경로 무변경 |

## 완료 기준

- 9개 흐름이 신규 경로로 동작하고, 코드에 구 경로 문자열이 없다
- 탈퇴·초대 수락 실패 시 **백엔드가 준 사유**가 화면에 뜬다
- 댓글이 500자에서 입력이 막힌다

## Result

**완료** (2026-08-21) — `agent/task-41-flag-api-url-refactor`, 커밋 3개

Phase 1~3 통과. tsc 0 에러, 구 경로 grep 0건, 9개 흐름 전부 실측 확인.
스크린샷 `harness/verify/verify-41-*.png`.

### 확인된 백엔드 문구 (FE가 그대로 노출)

| 상황 | status | 문구 |
|---|---|---|
| 종료된 Flag에서 참여 취소 | 409 `FlagInvalidStatusException` | "모집 기간이 종료된 이후에는 참여를 취소할 수 없습니다." |
| 만료된 초대 수락 | 409 `FlagDeadlinePassedException` | "모집 기간이 지난 깃발입니다." |

둘 다 표시용 한국어라 **「범위」의 판단(덮어쓰기만 멈추면 된다)이 실측으로 확인됐다.**
`status` 기반 문구 분기는 필요 없다.

### 명세 정정 — "모집 종료"는 ENDED를 뜻한다

모집만 마감된 `WAITING` 상태에서는 탈퇴가 **204로 허용된다.** 409는 행사가 끝난
`ENDED`에서만 발생한다. UI에서 도달 가능한 경로다 — "참여 취소" 버튼이
`isParticipating && !isHost` 조건이라 종료된 Flag에서도 노출된다.

### 기록해둘 것

- **`flag-seed-controller` 삭제** — orval 재생성이 모델 export를 지웠는데 stale 컨트롤러가
  남아 **작업 시작 시점부터 tsc가 깨져 있었다.** 백엔드에서 삭제된 엔드포인트이고 import처가 없다.
- 탈퇴·초대권한은 호스트 계정으로 UI 재현이 안 되어 응답 본문으로 경로 존재를 판별했다.
  `404`만으로는 "경로 없음"과 "리소스 없음"이 구분되지 않는다.
- 검증 중 `Jest worker` 500이 있었으나 `next dev` 인스턴스 2개 충돌이 원인이었다. 코드와 무관.
