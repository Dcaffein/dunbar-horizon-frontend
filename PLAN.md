# PLAN: Task 51 — 백엔드 오류 코드 계약 소비와 화면 정합성

## 상태

계획 작성 완료. **사용자 승인 대기 중 — 아직 구현 파일이나 브랜치는 변경하지 않는다.**

## 1. 목표와 정책

백엔드는 Java 예외 클래스명/포괄 상태 코드를 제거하고, 93개의 안정적인 오류 코드로
세분화했다. 프론트는 최종 93개 계약을 타입 기록에 반영하고, 서버 `message`가 아닌
프론트 소유 문구를 화면에 사용한다. 알 수 없는 코드는 안전한 일반 문구로 처리한다.

서버 문구를 UI 정본으로 쓰지 않는 쪽을 선택한다. 문구는 릴리스마다 바뀌거나 내부
식별자/영문 검증 문구를 포함할 수 있고, 화면의 어조와 노출 정책은 프론트가 책임져야
한다. 필드별 `validation` 바인딩은 미착수 Task 45의 범위를 존중해 이번 작업에서
확장하지 않는다.

Task 44의 조회 실패/빈 상태 분리는 완료된 상태로 유지한다. 새 코드가 생겼으므로,
화면이 실제 상태와 달라지는 것으로 검증된 409에 한해 재조회 동작을 추가한다.

## 2. 확인한 현재 사실

- `ApiErrorCode`는 이전 계약의 65개를 기록한다. 새 93개 표와 비교하면 43개가 빠져
  있고, `FLAG_INVALID_STATUS`, `FLAG_SCHEDULE_INVALID` 등 14개 옛 코드가 남아 있다.
- 런타임은 `ApiErrorBody.error: string`으로 받으므로 즉시 깨지지는 않는다. 새 코드를
  타입 안전하게 분기하려면 유니온을 갱신해야 한다.
- `toFailure()`는 `kind`/`status`/`message`만 직렬화하며, Flag 변경 액션은 실패 때
  `message`만 반환한다. 따라서 클라이언트는 현재 409 원인을 판별할 수 없다.
- 아티팩트 표에는 각 엔드포인트별 반환 코드까지는 없으므로, 초대 수락 경쟁 상황을
  실제 백엔드로 재현해 확인한 코드만 화면 갱신에 연결한다.

## 3. 구현 범위

### 오류 계약·문구 — `src/api/apiClient.ts`

- `ApiErrorCode`를 아티팩트의 93개 코드와 정확히 동기화하고, 더는 존재하지 않는
  코드를 제거한다. 와이어 값인 `ApiErrorBody.error`와 `ApiError.code`는 계속
  `string`으로 둔다.
- 코드/전송 오류 종류를 입력으로 하는 프론트 소유 메시지 변환기를 둔다. 네트워크,
  타임아웃, 파싱, 5xx 및 주요 4xx/409는 한국어 UX 문구로 바꾸고, 미등록 코드는
  안전한 일반 문구를 쓴다. 서버 원문은 `detail`에만 남긴다.
- `Failure`에 직렬화 가능한 `code?: string`을 추가한다. `validation` UI 바인딩은
  Task 45에서 다룬다.

### Flag 변경 실패와 화면 정합성

- `src/app/actions/flag.ts`의 참여, 참여 취소, 초대 생성/수락/거절/취소, 모집 상태
  변경 액션이 `Failure`를 반환하도록 바꾼다.
- `FlagInvitationList.tsx`에서 초대 수락이 실측상 `FLAG_NOT_RECRUITING`일 때만 오류를
  표시하고 `router.refresh()`해 무효 카드가 목록에서 사라지게 한다.
- `FlagDetail.tsx`의 참여/참여 취소 409는 `FLAG_RECRUITMENT_CLOSED`,
  `FLAG_FULL_CAPACITY`, `FLAG_PARTICIPATION_DUPLICATE`를 실측한다. 재조회 후 화면이
  실제로 달라지는 코드에만 처리한다. Task 44에서 화면이 맞다고 판정한
  `FLAG_RECRUITMENT_CLOSED`에는 기계적으로 재조회를 붙이지 않는다.

## 4. 수정 예정 파일

| 파일 | 변경 |
|---|---|
| `src/api/apiClient.ts` | 93개 코드, 프론트 소유 문구, `Failure.code` |
| `src/api/apiClient.test.ts` | 원문 비노출/새 코드/직렬화 단위 테스트 |
| `src/app/actions/flag.ts` | Flag 변경 실패의 `Failure` 반환 |
| `src/components/Flag/FlagInvitationList.tsx` | 검증된 초대 수락 409 재조회 |
| `src/components/Flag/FlagDetail.tsx` | 실측 결과에 따른 참여 상태 정합성 처리 |
| `harness/tasks/51-error-code-contract-consumption.md` | 결정과 실측 결과 |
| `PLAN.md` | 이 계획과 검증 결과 |

Mock 파일은 만들지 않는다. 오류 코드와 경쟁 상태는 실제 백엔드 계약으로 검증한다.

## 5. 단계별 검증

### Phase 1 — 정적 분석·단위

- 아티팩트의 93개 코드와 `ApiErrorCode`를 대조하고, 실행 코드의 옛 Java 예외명/포괄
  코드를 검색한다.
- 서버 `message`가 어떤 값이어도 프론트 소유 문구만 화면 반환값에 쓰이고, 404/5xx
  원문이 새지 않으며, 새 409 코드가 `Failure.code`에 보존되는지 단위 테스트한다.
- `npm run lint`, `npx tsc --noEmit`을 실행해 기존 기준선 대비 새 오류가 없는지 확인한다.

통과 후: `test(phase1): 오류 코드 계약과 프론트 문구 정책을 검증한다`

### Phase 2 — UI·상태

- 실제 백엔드에서 초대 목록을 연 뒤 모집을 마감하고 수락을 시도한다.
- 응답 코드와 화면을 기록한다. `FLAG_NOT_RECRUITING`이면 오류 후 재조회로 카드가
  사라지는지, 정상 수락·거절·취소가 회귀하지 않는지 확인한다.
- 스크린샷은 `harness/verify/verify-51-*.png`에만 저장하고 커밋하지 않는다.

통과 후: `test(phase2): 초대 경쟁 상태의 화면 정합성을 검증한다`

### Phase 3 — 예외·회귀

- 참여/참여 취소의 `FLAG_RECRUITMENT_CLOSED`, `FLAG_FULL_CAPACITY`,
  `FLAG_PARTICIPATION_DUPLICATE`를 가능한 범위에서 재현한다.
- 각 코드가 재조회 후 실제 화면 변화를 만드는지 기록하고, 아니라면 재조회하지 않는다.
- 네트워크·타임아웃·404·5xx·미지 코드가 서버 원문/내부 ID 없이 안전한 문구로 보이며,
  Task 44의 실패 상태와 실제 빈 상태가 계속 구분되는지 확인한다.

통과 후: `test(phase3): 오류 코드별 상태 정합성과 원문 비노출을 검증한다`

## Phase 1 검증 결과 — 통과

- 아티팩트 코드표와 `ApiErrorCode`를 기계적으로 대조해 **93개/93개 일치**를 확인했다.
- `npm test -- --run src/api/apiClient.test.ts` — 7/7 통과. 서버 원문 비노출,
  미지 4xx의 일반 문구, `FLAG_NOT_RECRUITING`의 코드 보존을 포함한다.
- `npx tsc --noEmit` — 통과. `npm run lint`는 기존 3 errors/11 warnings와 동일하며,
  이번 변경 파일에서는 새 진단이 없다.

## Phase 2·3 실측 결과 — 계약 배포 대기

- 두 테스트 계정으로 임시 Flag를 생성해 초대를 시도했으나, 현재 로컬 백엔드는
  아티팩트에 없는 이전 코드 `409 FLAG_INVALID_STATUS`를 반환했다. 즉 세분화 계약은
  아직 이 서버에 배포되지 않았다. 임시 Flag는 검증 직후 `204`로 삭제했다.
- 따라서 초대 수락의 `FLAG_NOT_RECRUITING` 경합은 실측하지 못했고, 컴포넌트 단위
  테스트로 카드 제거·안내·재조회를 검증했다.
- 현재 참여 중인 종료 Flag에 다시 참여시켜 `409 FLAG_PARTICIPATION_DUPLICATE`를
  실측했다. 화면은 이미 참여 상태가 맞으므로 재조회하지 않는 것이 맞다.
- 이 응답의 서버 `message`에는 사용자·Flag 내부 ID가 남아 있었다. 프론트 원문 차단
  정책이 실제 배포 상태에서도 필요함을 확인했다.
- `FLAG_NOT_RECRUITING`, `FLAG_FULL_CAPACITY`, `FLAG_RECRUITMENT_CLOSED`의 실제
  경쟁 상태는 초대 또는 두 번째 테스트 계정이 준비되면 수동 UI로 추가 확인한다.

## 6. 승인 후 절차

승인되면 현재 완료된 Task 50 브랜치에서
`agent/task-51-error-code-contract-consumption` 브랜치를 만들고, 위 Phase 순서로
구현·검증·커밋한다.

## Archived: Task 50 complete plan

백엔드 릴리스 하나에 두 변경이 함께 들어왔다. **성격이 다르므로 분리해서 다룬다.**

| 변경 | 성격 | 지금 상태 | 이번에 할 일 |
|---|---|---|---|
| 계정 경로 `/api/auth` → `/api/v1/auth` | **깨짐** | 로그인·가입·재발급·프로필이 404 | 8곳 전환 |
| `error` 값 65개 → 코드 상수 | 안 깨짐 | 분기 소비처 0건, 로그만 | 타입으로 받아 적기 + 분기 1곳 신설 |
| 500 → 400·415 (2건) | **동작 바뀜** | 5xx라 고정 문구로 덮이던 것이 이제 통과 | 실측 후 판정 |

착수를 막는 미확정 항목은 없다. 백엔드 문의 3건은 모두 답을 받아 태스크 문서에 기록했다.
유일한 미확정은 **400·415 두 건의 실제 문구**이고, Phase 3에서 실측으로 판정한다.

### 작업 범위

- 계정 관련 8개 호출부의 URL 전환 (3개 파일)
- `ApiErrorCode` 타입 정의, `ApiError.code` 출처 주석
- `mapSignupError`의 만료 판정을 `error` 코드 비교로 교체
- `tsc`를 깨뜨리고 있는 stale 생성 controller 2개 삭제
- Task 40 문서의 계약 오기 정정 (완료)
- `TESTING_RULES.md`에서 존재하지 않는 fixtures 참조 제거 (완료)

### 범위에서 뺀 것

| 항목 | 이유 |
|---|---|
| 409 → 재조회 동작 분기 | Task 44. 문구가 아니라 동작 변경이라 화면 설계가 필요하다 |
| `validation` 필드 바인딩 | Task 45 |
| API 경로 상수화 | 전환과 구조 변경을 한 커밋에 섞지 않는다 |
| 에러 문구를 프론트가 소유 | 별건. 29곳의 통과 경로를 매핑 테이블로 갈아야 한다 |

## 2. 착수 전 확인한 사실

코드를 읽어 확인한 것들이다. 설계의 근거가 되므로 여기 남긴다.

- **앱 코드는 `@/api/generated`를 한 번도 import 하지 않는다.** 타입만 `@/api/model`에서 가져오고
  URL은 손으로 적어 `apiClient`로 호출한다. 생성된 controller는 계약 참조 문서지 런타임 코드가 아니다.
  → stale controller 삭제가 동작에 영향을 주지 않는 근거.
- **`social-network-controller`는 `social-query-controller`의 이름만 바뀐 것.** URL 5개가 모두 동일하다.
  → 네트워크 관련 프론트 변경 없음.
- **`error` 값을 읽는 곳은 `apiClient.ts:163` 하나**이고, 그 값은 `apiClient.ts:197` 로그 한 줄에만 쓰인다.
  → 65개 코드 교체가 프론트를 깨뜨리지 않는 근거.
- **presign은 이미 POST로 호출하고 있다**(`profile.ts:22`). 생성 코드의 method와 일치한다.
- **사전 확인 엔드포인트를 이미 쓰고 있다.** `resolveVerification`(`auth.ts:205`)이 폼을 그리기 전에
  호출한다. 추가 작업 없음.
- `deviceTokenRequest.token`이 필수로 강화됐지만 호출부가 항상 값을 넘겨 `tsc` 영향이 없다.

## 3. 계정 경로 전환

세 파일의 성격이 달라서 한 덩어리로 보지 않는다.

### `src/app/actions/auth.ts` — 5곳

쿠키 헤더를 직접 파싱해야 해서 `apiClient`가 아니라 raw `fetch`를 쓴다. **이 구조는 유지한다.**

| 줄 | 기존 | 신규 |
|---|---|---|
| 163 | `POST /api/auth/verifications` | `/api/v1/auth/verifications` |
| 212 | `GET /api/auth/verifications/{token}` | `/api/v1/auth/verifications/{token}` |
| 254 | `POST /api/auth/tokens` | `/api/v1/auth/tokens` |
| 301 | `POST /api/auth/users` | `/api/v1/auth/users` |
| 331 | `DELETE /api/auth/tokens` | `/api/v1/auth/tokens` |

`Set-Cookie` 형식이 그대로임을 백엔드가 확인했으므로 `parseSetCookie`는 손대지 않는다.

### `src/proxy.ts` — 1곳

| 줄 | 기존 | 신규 |
|---|---|---|
| 43 | `PATCH /api/auth/tokens` | `/api/v1/auth/tokens` |

**가장 위험한 한 줄이다.** 틀리면 재발급이 조용히 실패해 액세스 토큰이 만료된 전원이 로그아웃된다.
Phase 2에서 토큰 만료 상황을 반드시 재현한다.

### `src/app/actions/profile.ts` — 2곳

접두사만 붙는 게 아니라 **`auth`에서 `users`로 소속이 바뀌었다.** 생성 코드에서도
`account-controller`에서 빠져 `user-controller`로 이동했다.

| 줄 | 기존 | 신규 |
|---|---|---|
| 24 | `POST /api/auth/users/me/profile-image/presign?contentType=` | `POST /api/v1/users/me/profile-image/presign?contentType=` |
| 37 | `PATCH /api/auth/users/me` | `PATCH /api/v1/users/me` |

`/api/v1/auth/users/me`로 잘못 바꾸면 404다. 전환 후 `grep`으로 확인한다.

## 4. 에러 코드 계약 수용 — `src/api/apiClient.ts`

### 타입

```ts
/** 백엔드가 정의한 에러 코드. 분기에 쓸 때만 이 타입과 비교한다. */
export type ApiErrorCode =
  | "ACCOUNT_VERIFICATION_TOKEN_INVALID"
  | "FLAG_INVALID_STATUS"
  | ...;
```

**`ApiErrorBody.error`는 `string`으로 둔다.** 와이어 값을 유니온으로 선언하면 백엔드가 코드를
추가했을 때 타입이 사실과 어긋난다. 좁히는 것은 비교하는 자리에서 한다.

65개를 모두 적을지 실제로 비교에 쓰는 것만 적을지는 **전부 적는 쪽**으로 한다.
타입일 뿐이라 비용이 없고 계약 기록 역할을 겸한다. 정본은 백엔드가 전달한 코드표다.

### 주석

```ts
/** 서버 본문의 `error` — 백엔드가 정의한 코드. 로그용이며 분기는 회원가입 한 곳뿐이다. */
readonly code?: string;
```

이름은 `code` 그대로 둔다. `ApiError.error`는 클래스 안에서 자기 자신이나 원본 예외(`detail`)를
가리키는 것처럼 읽힌다. 혼동의 원인은 이름이 아니라 출처가 안 적혀 있던 것이었다.

## 5. 회원가입 만료 판정 교체 — `src/app/actions/auth.ts`

`mapSignupError`가 400의 `validation.token` 키 유무로 만료를 판정하고 있다.
**그 주석의 전제가 틀렸다** — 400 + `validation.token`은 만료가 아니라 *token 필드가 비어서 온 것*이고,
만료는 처음부터 410으로 따로 왔다. 410 분기가 이미 있어 **화면 결과는 옳았지만 근거가 틀린 상태**였다.

- 410 분기의 조건을 `error === "ACCOUNT_VERIFICATION_TOKEN_INVALID"`로 바꾼다.
  상태 코드보다 코드가 안정적이다 — 410을 쓰는 다른 응답이 생겨도 흔들리지 않는다. 백엔드도 이 방식을 권했다.
- `validation.token` 분기는 남기되 주석을 사실에 맞게 고친다. 빈 토큰은
  `verify-email/page.tsx`의 `if (!token)` 가드가 이미 걸러 사실상 도달하지 않지만 방어로 둔다.

**프론트에서 `error` 값을 읽어 분기하는 최초의 지점이다.**

## 6. stale 생성 코드 삭제

| 디렉터리 | 상태 |
|---|---|
| `src/api/generated/flag-query-controller/` | 제거된 `GetUserFlagsByRoleParams`를 import — **현재 `tsc` 에러** |
| `src/api/generated/social-query-controller/` | `social-network-controller`와 완전 중복 |

orval은 스펙에서 사라진 controller 파일을 지우지 않는다. 앱이 `@/api/generated`를 import 하지 않으므로
삭제해도 런타임 영향이 없고, 삭제해야 `tsc`가 깨끗해진다.

## 7. 생성·수정 파일

| 파일 | 작업 |
|---|---|
| `src/app/actions/auth.ts` | 경로 5곳 + `mapSignupError` 분기 |
| `src/app/actions/profile.ts` | 경로 2곳 (소속 변경 포함) |
| `src/proxy.ts` | 경로 1곳 |
| `src/api/apiClient.ts` | `ApiErrorCode` 추가, `code` 주석, (Phase 3 결과에 따라) 400·415 규칙 |
| `src/api/generated/flag-query-controller/` | 삭제 |
| `src/api/generated/social-query-controller/` | 삭제 |
| `src/api/**` (재생성분) | 이미 작업 트리에 있음. 첫 커밋에 포함 |
| `harness/tasks/50-*.md` | 태스크 문서. 첫 커밋에 포함 |
| `harness/tasks/40-*.md` | 계약 오기 정정 (완료) |
| `harness/TESTING_RULES.md` | fixtures 참조 제거, 스크린샷 비커밋 명시 (완료) |
| `.gitignore`, `.claude/settings.local.json` | 시연 브랜치에서 따라온 환경 변경. **별도 커밋으로 분리** |

Mock 파일은 만들지 않는다. 실제 백엔드를 상대로 검증하는 태스크다.

## 8. 단계별 작업·검증

`harness/TESTING_RULES.md`의 3단계 프로토콜을 따른다. **각 Phase 통과 시 즉시 커밋한다.**

### Phase 1 — 정적 분석·단위

작업 전 기준선을 먼저 기록한다. 현재 `tsc` 출력에 이 태스크와 무관한 노이즈가 섞여 있다
(`.next/dev/types`의 stale 참조, 시연 브랜치에서 남은 `*.test.ts`). **작업 전 총계를 적어두지 않으면
개선 여부를 판정할 수 없다.**

- `npx tsc --noEmit` — 작업 전 총계 기록 → 작업 후 `flag-query-controller` 에러가 사라졌는지
- `npm run lint` — 작업 전후 총계 동일
- `grep -rn "/api/auth" src` **결과 0건** — 이 태스크의 완료 조건
- `grep -rn "api/v1/auth/users/me" src` **결과 0건** — 소속 변경을 접두사 추가로 잘못 처리하지 않았는지

→ 통과 시 `test(phase1): 계정 경로 전환과 에러 코드 계약을 정적 검증한다`

### Phase 2 — UI·상태

**전제: 백엔드가 새 스펙으로 `localhost:8080`에 떠 있어야 한다.** 계정 API는 Mock으로 대체할 수 없다.

테스트 계정은 `harness/TESTING_RULES.md`의 이수환 / `leesuhwan@test.com` / `String123!` (user_id=4).

| 시나리오 | 확인 |
|---|---|
| 로그인 | 쿠키 2개 발급, 메인 진입, 그래프 렌더 |
| 회원가입 | 인증 메일 발송 → 링크 진입 → 폼 → 가입 → 자동 로그인 |
| 프로필 수정 | 닉네임 변경 반영 |
| 프로필 이미지 | presign 획득 → 업로드 → 반영 |
| **토큰 재발급** | 액세스 토큰 만료 후 임의 화면 진입 → `proxy.ts` 재발급 동작, 로그인으로 안 튕김 |
| 로그아웃 | 쿠키 삭제 → `/login` |

스크린샷은 `harness/verify/verify-50-{NN}-{설명}.png`에 저장하되 **커밋하지 않는다.**
검증 중 눈으로 확인하는 용도이고, 결과는 이 문서에 글로 남긴다.

→ 통과 시 `test(phase2): 계정 플로우를 실제 백엔드로 검증한다`

### Phase 3 — 예외·회귀

| 시나리오 | 확인 |
|---|---|
| **`/api/v1/flags/abc` 호출** | 400 `INVALID_PARAMETER_TYPE`의 실제 `message` 수집 → 사용자에게 보여도 되는지 **판정** |
| **Content-Type 불일치** | 415 `UNSUPPORTED_MEDIA_TYPE`도 같은 판정 |
| 잘못된 비밀번호 로그인 | 401 `ACCOUNT_INVALID_CREDENTIALS` 문구가 기존과 같은지 |
| 만료 토큰으로 가입 제출 | 410 → 코드 비교로 바꾼 뒤에도 같은 만료 화면 |
| 이미 사용된 토큰 | 같은 410·같은 코드. 같은 안내가 떠야 한다 |
| 만료 링크로 `/verify-email` 진입 | `resolveVerification`이 폼 대신 만료 화면 (회귀) |
| 리프레시 토큰 삭제 후 액션 호출 | 401 → `redirect("/login")` 유지 |
| 로그 확인 | `[apiClient] ... → http 409 FLAG_INVALID_STATUS` 형태로 새 코드가 찍히는지 |

**판정 분기.** 400·415 문구가

- 사용자에게 보여도 되면 → `apiClient` 변경 없음. 현재 규칙이 그대로 통과시킨다.
- 내부 정보를 담고 있으면 → 404와 같은 방식으로 고정 문구를 추가한다.

`INVALID_PARAMETER_TYPE`은 프론트가 잘못된 URL을 만들었을 때만 발생하므로 사실상 프론트 버그 신호다.
사용자에게는 어떤 문구도 도움이 되지 않으니, 판정이 애매하면 고정 문구 쪽으로 기운다.

→ 통과 시 `test(phase3): 상태 코드 변경 2건의 문구를 실측 판정한다`

## 9. 결정 완료

착수 전 세 가지를 물었고 모두 답을 받아 반영했다.

### 1. Task 40 문서의 오기 — 정정함

`40-auth-token-based-signup.md`의 「확정된 백엔드 계약」 표를 고쳤다.

- 400 은 `{ error, validation }` 가 아니라 `{ error, message, validation }` 이다.
- 만료는 400 이 아니라 **410** 이고, 코드는 `ACCOUNT_VERIFICATION_TOKEN_INVALID` 다.
- 410·409 행의 예외 클래스명을 새 코드로 교체했다.

**그 문서는 자기 자신과 모순돼 있었다.** 위쪽 표는 "`message` 키 없음"이라고 적었는데,
같은 문서 아래 「백엔드 실측으로 확인된 계약」에는 "400 본문에 `message` 와 `validation` 동시 존재"가
적혀 있다. 실측 결과가 위쪽 표에 반영되지 않은 채 남아 있었고, 그 표를 근거로 삼은 것이
`mapSignupError` 의 `validation.token` 추론이다. 정정 경위를 인용 블록으로 문서에 남겼다.

### 2. 스크린샷 — 커밋하지 않음

`harness/verify/`는 `.gitignore` 대상으로 유지한다. `TESTING_RULES.md`의 Phase 2 절에
비커밋 방침을 명시했다. 검증 결과는 이미지가 아니라 글로 남긴다.

이미 tracked 된 과거 스크린샷(36·37·38·46·47번)은 그대로 둔다. `.gitignore`는 추적을 해제하지
않으므로 새로 찍는 `verify-50-*` 만 무시된다. 과거 것까지 저장소에서 들어내려면 별도 정리가 필요하다.

### 3. fixtures — 참조 제거

`TESTING_RULES.md`에서 `harness/fixtures/` 표와 "fixtures를 사용한다" 지시를 뺐다.
테스트 계정 정보는 유용하므로 남겼다.

**경위.** fixtures 는 실재했다. Task 27(`27729fe`, 2026-06-13)이 `users.md` 114줄,
`friendships.md` 92줄을 추가하면서 TESTING_RULES 에 참조를 함께 넣었다.
6일 뒤 **`994fa50`(Buzz 보낸 탭 추가)이 두 파일을 삭제했다.** 그 커밋은 capture 스크립트 6개와
스크린샷 다수도 함께 지웠는데, **커밋 메시지에는 그 사실이 한 줄도 없다.** Buzz 기능 설명뿐이다.
harness 정리 작업이 무관한 기능 커밋에 묻어 들어간 것으로 보인다.

이후 3개월간 TESTING_RULES 는 없는 파일을 가리키고 있었다. 이번에 제거했다.

**부수로 발견한 불일치 — 해소됨.** 삭제된 `users.md` 는 기본 계정 이메일을 `lsh@test.com` 으로
적었으나 **유효한 계정은 `leesuhwan@test.com` 이다**(사용자 확인). `TESTING_RULES.md` 쪽이 옳다.

## 10. 검증 결과

### Phase 1 — 통과 (`8a2ee0a`)

| 항목 | 전 | 후 |
|---|---|---|
| `tsc --noEmit` | 21건 | **20건** — `flag-query-controller` 해소 |
| `lint` | 14 problems (3E/11W) | 14 problems — 동일 |
| `grep "/api/auth" src` | 8건 | **0건** |
| `grep "api/v1/auth/users/me"` | — | **0건** |

잔여 tsc 20건은 모두 사전 존재다 — 시연 브랜치에서 남은 `*.test.ts` 19건(`.gitignore` 대상이라
커밋된 적 없고, 이 브랜치에는 짝이 되는 원본 모듈이 없다)과 `.next` 캐시 1건.

`social-query-controller` → `social-network-controller` 는 git 이 **100% rename 으로 인식**했다.
내용이 완전히 동일하다는 사전 분석이 확인됐다.

### Phase 2 — 통과

백엔드가 새 스펙으로 떠 있음을 먼저 확인했다. 새 경로 `POST /api/v1/auth/tokens` 는 400(엔드포인트
존재, 본문 검증 실패), 옛 경로 `/api/auth/tokens` 는 401(라우팅이 없어 시큐리티 필터가 가로챔).

| 시나리오 | 결과 |
|---|---|
| 로그인 | 201, `access_token`·`refresh_token` 발급, `/` 진입 |
| 메인 그래프 | 친구 목록 렌더(강민석·강민수·…), 알림 12건, canvas 3개, 실패·빈상태 문구 없음 |
| 프로필 조회 | `GET /api/v1/users/me` — 이메일·닉네임 정상 |
| 프로필 수정 | `PATCH /api/v1/users/me` — 저장 후 새로고침해도 유지(서버 반영 확인), 원복까지 완료 |
| 프로필 이미지 | `POST /api/v1/users/me/profile-image/presign` — S3 키 발급·업로드·서명 URL 반환 |
| **토큰 재발급** | 만료 JWT 로 교체 후 보호 경로 진입 → **로그인으로 안 튕기고 토큰 갱신**, 친구 목록 정상 |
| 로그아웃 | `/login` 이동, 쿠키 2개 삭제 |
| 회원가입 | 메일 링크(`/?verifyToken=`) → `proxy.ts` 가 `/verify-email` 로 이동 → 사전 확인이 이메일 채운 폼 → 가입 → **자동 로그인** |

`Set-Cookie` 는 백엔드 답변대로 형식이 그대로였다(`Path=/; Max-Age; HttpOnly; SameSite=Lax`).
로컬 프로필이라 `Secure` 는 빠져 있으나 `parseSetCookie` 는 양쪽 모두 처리한다.

**재발급 검증 방법.** `proxy.ts` 는 서명을 검증하지 않고 `exp` 만 본다. 그래서 만료된 것처럼 보이는
JWT 를 만들어 `access_token` 만 교체하고 `refresh_token` 은 남겼다. 실제 만료를 1시간 기다릴 필요가 없다.

### Phase 3 — 통과

#### 400·415 문구 판정 — 갈렸다

실측 결과다.

| 상태 | `error` | 서버 `message` | 판정 |
|---|---|---|---|
| 415 | `UNSUPPORTED_MEDIA_TYPE` | `지원하지 않는 요청 형식입니다.` | **그대로 통과** — 내부 이름 없음 |
| 400 | `INVALID_PARAMETER_TYPE` | `요청 파라미터의 형식이 올바르지 않습니다: flagId` | **덮는다** — 파라미터명 노출 |

400 의 `: flagId` 는 백엔드 파라미터명이라 사용자에게 뜻이 없다. 게다가 이 오류는 프론트가 잘못된
URL 을 만들었을 때만 난다 — 사용자가 할 수 있는 일이 없다. 계획의 "애매하면 고정 문구" 기준을 따랐다.

구현은 `FE_OWNED_MESSAGE` 표다. 404·5xx 처럼 상태 코드로 통째로 가리는 것이 아니라 **코드 단위**로
예외를 두는 장치이고, 여기 없는 4xx 는 지금처럼 서버 문구를 그대로 통과시킨다.

**`Object.hasOwn` 가드를 넣었다.** 서버가 보낸 문자열로 객체를 인덱싱하므로 `error: "constructor"` 가
오면 프로토타입의 함수가 잡혀 문구 자리에 함수가 들어간다. 테스트로 막았다.

#### 이 경로는 현재 프론트에서 도달하지 않는다

`/flags/abc` 로 시도했으나 `flags/[id]/page.tsx:14` 의 `if (isNaN(id)) redirect("/flags")` 가
API 호출 전에 막는다. 즉 `INVALID_PARAMETER_TYPE` 덮어쓰기는 **지금 당장 쓰이는 것이 아니라
앞으로의 프론트 버그(`/flags/undefined` 등)에 대한 방어**다. 그래서 UI 가 아니라 단위 테스트로 검증했다.

#### 단위 테스트 6건 통과 — `src/api/apiClient.test.ts`

문구 판정 규칙 전체를 고정했다: 400 덮어쓰기 / 415 통과 / 표에 없는 409 통과 /
404 는 코드 무관하게 덮음(`존재하지 않는 flag : 99999999` 가 새지 않음) / 5xx 본문 불신 /
프로토타입 키 방어.

#### 새 코드 계약 실측

| 상황 | 응답 |
|---|---|
| 잘못된 비밀번호 | `401 ACCOUNT_INVALID_CREDENTIALS` · `이메일 또는 비밀번호가 올바르지 않습니다.` |
| 없는 Flag | `404 FLAG_NOT_FOUND` · `존재하지 않는 flag : 99999999` |
| 종료<시작 | `409 FLAG_SCHEDULE_INVALID` · `종료는 시작보다 늦어야 합니다.` |
| 미인증 | `401 UNAUTHORIZED` · `인증되지 않은 사용자입니다.` |

**404 가 여전히 내부 ID 를 담는다.** Task 43 에서 세운 404 덮어쓰기 규칙이 계속 필요하다는 뜻이다.

#### 회귀

- 만료 토큰 제출 → 만료 안내, 자동 로그인 쿠키 없음, 서버 원문 노출 없음
- 이미 사용된 토큰·존재하지 않는 토큰으로 `/verify-email` 진입 → 폼 대신 만료 화면
- 리프레시 토큰까지 없는 상태로 보호 경로 진입 → `/login?callbackUrl=%2F`, 쿠키 전부 삭제
- 로그가 새 코드로 찍힌다 — `[apiClient] GET /api/v1/flags/99999999 → http 404 FLAG_NOT_FOUND`

#### 최종 수치

| 항목 | 기준선 | 최종 |
|---|---|---|
| `tsc --noEmit` | 21건 | **19건** |
| `lint` | 14 (3E/11W) | **14 (3E/11W)** — 동일 |
| `vitest` | — | **6 passed** |
| `grep "/api/auth"` | 8건 | **0건** |

잔여 tsc 19건은 전부 시연 브랜치에서 남은 `*.test.ts` 짝 없는 모듈 참조다. 이 태스크의 코드와
테스트가 만든 것은 0건이다.

## 11. 브랜치

`agent/task-50-account-url-and-error-code-contract`

승인 후 `main`에서 분기한다. 현재 작업 트리의 API 재생성분과 설정 변경분을 함께 가져간다.
