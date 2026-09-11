# Task 50: 계정 API 경로 전환과 에러 코드 계약 수용

## 상태

구현 완료. Phase 1·2·3 통과. 실측 결과는 `PLAN.md` 의 「검증 결과」를 따른다.

착수 전 문의 3건은 모두 답을 받아 확정했다. 착수 후 갱신된 사실 둘:

- **400 `INVALID_PARAMETER_TYPE` 은 문구를 덮기로 했다.** 실측 문구가
  `요청 파라미터의 형식이 올바르지 않습니다: flagId` 로 백엔드 파라미터명을 담는다.
  415 `UNSUPPORTED_MEDIA_TYPE` 은 `지원하지 않는 요청 형식입니다.` 로 깨끗해 그대로 통과시킨다.
- **404 는 새 코드 계약 뒤에도 내부 ID 를 담는다**(`존재하지 않는 flag : 99999999`).
  Task 43 의 404 덮어쓰기 규칙이 계속 필요하다.

## 배경

두 가지 백엔드 변경이 함께 도착했다.

**하나. 계정 API가 `/api/v1` 아래로 들어갔다.** `/api/auth/*` 가 `/api/v1/auth/*` 로 바뀌었고,
프로필 관련 두 엔드포인트는 auth 가 아니라 users 로 옮겨갔다. 프론트는 아직 옛 경로를 호출하므로
로그인·회원가입·토큰 재발급·프로필 수정이 모두 404 가 된다. **이 릴리스에서 실제로 깨지는 것은 이쪽뿐이다.**

**둘. 에러 응답의 `error` 값이 예외 클래스명에서 코드 상수로 바뀌었다.** 클래스 이름을 바꾸면 계약이
조용히 깨지는 구조를 없앤 것이다. 필드 이름과 `message`·`validation`·상태 코드는 그대로다.
프론트는 현재 `error` 값으로 분기하는 곳이 한 군데도 없어(소비처는 로그 한 줄뿐) **깨지지 않는다.**
이 태스크에서는 계약을 타입으로 받아 적고, 상태 코드가 바뀐 2건의 실제 문구만 확인한다.

## API 변경표

### 계정 경로 — 반드시 고쳐야 하는 것

| 기능 | 기존 프론트 호출 | 신규 계약 | 호출부 |
|---|---|---|---|
| 인증 메일 발송 | `POST /api/auth/verifications` | `POST /api/v1/auth/verifications` | `auth.ts:163` |
| 인증 토큰 검증 | `GET /api/auth/verifications/{token}` | `GET /api/v1/auth/verifications/{token}` | `auth.ts:212` |
| 로그인 | `POST /api/auth/tokens` | `POST /api/v1/auth/tokens` | `auth.ts:254` |
| 회원가입 | `POST /api/auth/users` | `POST /api/v1/auth/users` | `auth.ts:301` |
| 로그아웃 | `DELETE /api/auth/tokens` | `DELETE /api/v1/auth/tokens` | `auth.ts:331` |
| 토큰 재발급 | `PATCH /api/auth/tokens` | `PATCH /api/v1/auth/tokens` | `proxy.ts:43` |
| 프로필 이미지 presign | `GET /api/auth/users/me/profile-image/presign` | `GET /api/v1/users/me/profile-image/presign` | `profile.ts:24` |
| 프로필 수정 | `PATCH /api/auth/users/me` | `PATCH /api/v1/users/me` | `profile.ts:37` |

마지막 두 건은 `/v1` 접두사만 붙는 것이 아니라 **`auth` 에서 `users` 로 소속이 바뀌었다.**
생성 코드에서도 `account-controller` 에서 빠져 `user-controller` 로 이동했다.

### 에러 코드 — 받아 적기만 하는 것

`error` 값 65개가 코드 상수로 교체됐다. 전체 대응표는 백엔드가 전달한 코드표를 정본으로 삼는다.

```
"error": "FlagNotFoundException"   →   "error": "FLAG_NOT_FOUND"
```

상태 코드가 바뀐 것은 2건뿐이다. 둘 다 재시도해도 소용없는 요청인데 500 으로 보고되고 있었다.

| 상황 | 전 | 후 |
|---|---|---|
| 경로변수·쿼리파라미터 타입 불일치 (`/api/v1/flags/abc`) | 500 | **400** `INVALID_PARAMETER_TYPE` |
| Content-Type 불일치 | 500 | **415** `UNSUPPORTED_MEDIA_TYPE` |

**이 2건이 프론트 동작을 바꾼다.** `apiClient` 의 판정 규칙(`apiClient.ts:154`)은 5xx 를 고정 문구로 덮고
그 외 4xx 는 서버 문구를 통과시킨다. 따라서 두 경우의 문구가 이제 **사용자 화면에 그대로 뜬다.**
Task 43 에서 404 문구가 내부 식별자를 담고 있어 통과시키면 안 된다는 것이 실측으로 드러난 적이 있으므로,
이 2건의 실제 문구도 눈으로 확인해야 한다.

### 변경 없음 — 확인만

| 대상 | 판정 |
|---|---|
| `social-network-controller` (신규 생성) | `social-query-controller` 의 **이름만 바뀐 것.** URL 5개가 모두 동일하므로 프론트 변경 없음 |
| `message`, `validation`, 필드 이름 | 그대로 |
| 403 응답 형식 통일 | 역할 기반 인가 규칙이 없어 발동 경로가 없음. 할 일 없음 |
| `deviceTokenRequest.token` 이 필수로 강화 | 호출부가 항상 값을 넘기고 있어 `tsc` 무영향 |
| `flagCreateRequest` 등 4개 모델의 길이 제약 주석 추가 | 타입 변화 없음(주석뿐) |

## 목표

- 계정 관련 8개 호출부가 모두 신규 경로를 사용한다.
- 프로필 두 엔드포인트가 `users` 소속으로 옮겨간 것을 호출부에도 반영한다.
- 에러 코드 계약을 타입으로 남기되, **와이어 값을 유니온으로 좁히지 않는다.**
- 상태 코드가 바뀐 2건의 문구가 사용자에게 보여도 되는지 판정하고, 아니면 고정 문구로 덮는다.
- `ApiError.code` 가 무엇을 담는지 주석으로 명시한다. 지금은 출처가 어디에도 적혀 있지 않다.
- 회원가입 만료 판정을 `validation.token` 추론에서 코드 비교로 바꾼다. 프론트 최초의 `error` 기반 분기다.
- `tsc` 를 깨뜨리고 있는 stale 생성 코드를 정리한다.

## 설계

### 1. 계정 경로 전환

`src/app/actions/auth.ts` · `src/app/actions/profile.ts` · `src/proxy.ts`

단순 치환이지만 세 파일의 성격이 다르다.

- `auth.ts` 5곳은 쿠키 헤더를 직접 파싱해야 해서 `apiClient` 가 아니라 raw `fetch` 를 쓴다. 이 구조는 유지한다.
- `proxy.ts` 1곳은 미들웨어의 토큰 재발급이다. **여기가 틀리면 재발급이 조용히 실패해 전원이 로그아웃된다.**
- `profile.ts` 2곳은 `apiClient` 를 쓰므로 경로 문자열만 바꾼다.

경로를 상수로 모을지는 이번 범위 밖으로 둔다. 8곳이 세 파일에 흩어져 있을 뿐이고,
지금 상수 파일을 만들면 전환과 구조 변경이 한 커밋에 섞인다.

### 2. 에러 코드 타입

`src/api/apiClient.ts`

```ts
/** 백엔드가 정의한 에러 코드. 분기에 쓸 때만 이 타입과 비교한다. */
export type ApiErrorCode = "FLAG_NOT_FOUND" | "FLAG_INVALID_STATUS" | ...;
```

**`ApiErrorBody.error` 는 `string` 으로 둔다.** 와이어에서 온 값을 유니온으로 선언하면,
백엔드가 코드를 추가했을 때 타입이 사실과 어긋난다. 좁히는 것은 비교하는 자리에서 한다.

`ApiError.code` 는 이름을 유지하되 출처를 주석으로 못 박는다.

```ts
/** 서버 본문의 `error` — 백엔드가 정의한 코드. 로그 전용, 분기는 아직 없다. */
readonly code?: string;
```

앞서 `code` 라는 이름이 응답에 `code` 필드가 있는 것처럼 읽혀 혼동을 부른 적이 있다.
이름을 바꾸는 것보다 출처를 적는 편이 낫다 — `ApiError.error` 는 클래스 안에서
자기 자신이나 원본 예외(`detail`)를 가리키는 것처럼 읽힌다.

### 3. 회원가입 만료 판정을 코드 비교로 바꾼다

`src/app/actions/auth.ts` · `mapSignupError`

현재는 400 응답의 `validation.token` 키 유무로 만료를 판정한다.

```ts
if (status === 400) {
  const validation = body.validation ?? {};
  // token 은 사용자가 폼에서 고칠 수 있는 값이 아니므로 만료와 동일하게 다룬다.
  if (validation.token) {
    return { message: EXPIRED_MESSAGE, outcome: "expired" };
  }
```

**이 주석의 전제가 틀렸다.** 400 + `validation.token` 은 만료가 아니라 *token 필드가 비어서 온 것*이고,
만료는 처음부터 410 으로 따로 왔다. 410 분기(`auth.ts:149`)가 이미 있으므로 **결과 화면은 옳았지만
근거가 틀린 상태**였다. 실제로 두 응답은 상태 코드부터 다르다.

- 410 분기의 조건을 `error === "ACCOUNT_VERIFICATION_TOKEN_INVALID"` 로 바꾼다.
  상태 코드보다 코드가 안정적이다 — 410 을 쓰는 다른 응답이 나중에 생겨도 흔들리지 않는다.
  백엔드도 이 방식을 권했다.
- `validation.token` 분기는 남기되 주석을 사실에 맞게 고친다. 빈 토큰은 `verify-email/page.tsx` 의
  `if (!token)` 가드가 이미 걸러서 사실상 도달하지 않지만, 방어로 둔다.

**프론트에서 `error` 값을 읽어 분기하는 최초의 지점이다.** 그래서 `ApiErrorCode` 를 이 태스크에서
정의한다. 나머지 64개는 아직 비교에 쓰이지 않는다.

### 4. 상태 코드가 바뀐 2건의 문구 판정

실측 후 결정한다.

- 문구가 사용자에게 보여도 되면 → `apiClient` 변경 없음. 지금 규칙이 그대로 통과시킨다.
- 내부 정보를 담고 있으면 → 404 와 같은 방식으로 고정 문구를 쓴다.

`INVALID_PARAMETER_TYPE` 은 프론트가 잘못된 URL 을 만들었을 때만 발생하므로 사실상 프론트 버그 신호다.
사용자에게는 어떤 문구든 도움이 되지 않으니, 판정이 애매하면 고정 문구 쪽으로 기운다.

### 5. stale 생성 코드 정리

orval 은 스펙에서 사라진 controller 파일을 지우지 않는다. 지금 두 개가 남아 있다.

| 파일 | 상태 |
|---|---|
| `flag-query-controller/` | 제거된 `GetUserFlagsByRoleParams` 를 import — **`tsc` 에러 발생 중** |
| `social-query-controller/` | `social-network-controller` 와 완전 중복 |

**앱 코드는 `@/api/generated` 를 단 한 번도 import 하지 않는다.** 타입만 `@/api/model` 에서 가져다 쓰고,
URL 은 손으로 적어 `apiClient` 로 호출한다. 즉 생성된 controller 는 계약 참조용 문서지 런타임 코드가 아니다.
따라서 두 디렉터리는 삭제해도 동작에 영향이 없고, 삭제해야 `tsc` 가 깨끗해진다.

## 수정 예상 파일

| 파일 | 내용 |
|---|---|
| `src/app/actions/auth.ts` | 경로 5곳 |
| `src/app/actions/profile.ts` | 경로 2곳 (`auth` → `users` 소속 변경 포함) |
| `src/proxy.ts` | 토큰 재발급 경로 1곳 |
| `src/api/apiClient.ts` | `ApiErrorCode` 추가, `code` 주석, (판정 결과에 따라) 400·415 규칙 |
| `src/api/generated/flag-query-controller/` | 삭제 |
| `src/api/generated/social-query-controller/` | 삭제 |

## 확정된 백엔드 계약

착수 전 세 가지를 물었고 모두 답을 받았다. 미확정 항목은 남아 있지 않다.

### `Set-Cookie` 형식은 바뀌지 않았다

`AuthCookieManager` 는 배포본 이후 커밋이 0건이다. 발급 형태가 그대로다.

```
access_token=<jwt>;  Path=/; Max-Age=<ACCESS_TTL>; HttpOnly; Secure; SameSite=Lax[; Domain=...]
refresh_token=<jwt>; Path=/; Max-Age=604800;       HttpOnly; Secure; SameSite=Lax[; Domain=...]
```

로그아웃은 같은 이름·같은 `Path` 로 `Max-Age=0` 을 보낸다. **`parseSetCookie` 는 손대지 않는다.**
로그인·가입 응답도 201 + 빈 본문으로 동일하다. 즉 이 경로에서 깨지는 원인은 URL 하나뿐이다.

### 회원가입 400 에는 `message` 가 원래 있었다 — 그리고 만료는 400 이 아니다

**Task 40 문서의 "400 은 `{ error, validation }` — `message` 키 없음" 기술은 사실과 다르다.**
배포본에서도 `"입력값이 올바르지 않습니다."` 가 실려 나갔다. 이번에 바뀐 것은 `error` 값뿐이다.

| 상황 | status | `error` | `validation` |
|---|---|---|---|
| `token` 필드가 비어 있음 | 400 | `INVALID_INPUT` | `{ "token": "인증 토큰은 필수입니다." }` |
| 닉네임·비밀번호 규칙 위반 | 400 | `INVALID_INPUT` | 해당 필드 |
| **토큰 만료·무효·이미 사용됨** | **410** | `ACCOUNT_VERIFICATION_TOKEN_INVALID` | 없음 |

만료·미존재·이미 사용됨 셋을 구분하지 않는 것은 의도된 설계다. 사용자가 할 일은 "이메일부터 다시"로
같고, 구분해 주면 토큰 대입 시도의 피드백이 된다.

### flag·social 경로는 이미 전환했다

Task 47·49 에서 처리했다. 재생성된 스펙에 변경이 없던 것은 그 때문이다.
**이번 릴리스에서 프론트가 고칠 경로는 계정 8곳뿐이다.**

### 사전 확인 엔드포인트는 이미 쓰고 있다

`GET /api/v1/auth/verifications/{token}` 은 토큰을 소비하지 않고 유효성만 확인한다(200 → `{ email }`).
`resolveVerification`(`auth.ts:205`)이 폼을 그리기 전에 호출하고 `verify-email/page.tsx` 가 그 결과로
분기하므로, 사용자가 비밀번호·닉네임을 다 채운 뒤에 만료를 알게 되는 일은 이미 없다. **추가 작업 없음.**

## 제외 범위

| 항목 | 이유 |
|---|---|
| 409 → 재조회 동작 분기 | **Task 44.** 코드가 생겨 비로소 가능해졌지만 문구가 아니라 동작 변경이라 화면 설계가 필요하다 |
| `validation` 필드 바인딩 | **Task 45.** 폼 UI 변경 |
| 에러 문구를 프론트가 소유하기 | 별건. 지금은 백엔드 `message` 를 그대로 쓰는 구조이고, 바꾸려면 29곳의 통과 경로를 전부 매핑 테이블로 갈아야 한다 |
| API 경로 상수화 | 전환과 구조 변경을 한 커밋에 섞지 않는다 |
| `.gitignore` 의 `**/*.test.ts` 무시 규칙 | 시연 브랜치에서 들어온 변경. 이 태스크와 무관하나 `tsc` 노이즈의 원인이므로 Phase 1 에서 기준선만 기록한다 |

## 검증

### Phase 1 — 정적 분석·단위

- `npx tsc --noEmit` — stale controller 삭제 후 `flag-query-controller` 에러가 사라지는지.
  기준선에 `.next/dev/types` 와 시연 브랜치 잔여 `*.test.ts` 노이즈가 섞여 있으므로 **작업 전 총계를 먼저 기록한다.**
- `npm run lint` — 작업 전후 총계 동일.
- `grep -rn "/api/auth" src` 결과가 **0건**인지. 이 태스크의 완료 조건이다.

### Phase 2 — UI·상태

- 로그인 → 쿠키 2개 발급 → 메인 진입.
- 회원가입: 인증 메일 발송 → 링크 진입 → 가입 → 자동 로그인.
- 프로필 수정: 닉네임 변경, 이미지 업로드(presign 경로).
- 액세스 토큰 만료 후 임의 화면 진입 → `proxy.ts` 재발급이 동작하고 로그인으로 튕기지 않는지.
- 로그아웃 → 쿠키 삭제 → `/login`.

### Phase 3 — 예외·회귀

- **`/api/v1/flags/abc` 직접 호출** — 400 `INVALID_PARAMETER_TYPE` 의 실제 `message` 를 수집해
  사용자에게 보여도 되는 문구인지 판정한다. 이 태스크의 유일한 미확정 지점이다.
- Content-Type 을 바꿔 415 를 유도하고 같은 판정을 한다.
- 잘못된 비밀번호로 로그인 → 401 `ACCOUNT_INVALID_CREDENTIALS` 문구가 기존과 같은지.
- 만료된 인증 토큰으로 가입 제출 → 410 `ACCOUNT_VERIFICATION_TOKEN_INVALID` → 만료 안내.
  코드 비교로 바꾼 뒤에도 같은 화면이 나오는지 확인한다.
- 이미 사용된 토큰 → 같은 410·같은 코드(백엔드가 세 경우를 구분하지 않는다). 같은 안내가 떠야 한다.
- 만료된 링크로 `/verify-email` 진입 → `resolveVerification` 이 폼 대신 만료 화면을 그리는지(회귀).
- 리프레시 토큰을 지운 채 액션 호출 → 401 → `redirect("/login")` 경로가 그대로인지.
- 로그에 새 코드가 찍히는지 확인: `[apiClient] ... → http 409 FLAG_INVALID_STATUS`.

## 브랜치

`agent/task-50-account-url-and-error-code-contract`
