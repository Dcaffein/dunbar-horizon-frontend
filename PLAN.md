# PLAN: Task 40 — 토큰 기반 회원가입 플로우 전환

배경·계약·설계 근거는 `harness/tasks/40-auth-token-based-signup.md` 참고.

## 1. 요구사항 분석 및 작업 범위

### 신규 플로우

```
① /signup            이메일만 입력
                     └ POST /api/auth/verifications { email }      ← redirectPage 폐기
                       → "메일함을 확인해주세요" (유효시간 1시간 안내)

② 메일 링크 클릭 → https://{프론트}/?verifyToken=xxx
                     └ proxy.ts가 감지 → /verify-email?token=xxx 로 redirect
                     └ GET /api/auth/verifications/xxx
                       ├ 2xx → email 읽기 전용 표시 + [닉네임][비밀번호][비밀번호 확인]
                       ├ 5xx → "일시적인 오류입니다. 잠시 후 다시 시도해 주세요."
                       └ 그 외 → "링크가 유효하지 않습니다" + /signup 으로 다시 시작

③ 폼 제출            POST /api/auth/users { token, nickname, password }
                     ├ 201 → Set-Cookie 2개를 쿠키 스토어에 심고 → / (자동 로그인)
                     ├ 400 → validation을 필드별 폼 에러로 표시 (폼 유지)
                     ├ 410 → "인증 링크가 만료되었습니다" + /signup 으로 다시 시작
                     └ 409 → "이미 가입이 완료된 이메일입니다" + /login 버튼

OAuth 성공           변경 없음 (백엔드가 쿠키 발급 후 / 로 리다이렉트)
OAuth 실패           /login?error=... 로 리다이렉트 → 로그인 페이지가 배너 표시 (3-8)
```

### 현재 코드 충돌 지점

| 지점 | 현재 | 신규 계약에서 |
|---|---|---|
| [auth.ts:200](src/app/actions/auth.ts#L200) `signupAction` | `{email, nickname, password}` 전송 | `token` 누락으로 **400** |
| [auth.ts:245](src/app/actions/auth.ts#L245) `verifyEmailAction` | `PATCH /api/auth/verifications` | 엔드포인트 삭제 → **404** |
| [auth.ts:23-26](src/app/actions/auth.ts#L23-L26) 닉네임 검증 | `min(2)` · `max(10)` | 백엔드는 `1~20` |
| [signup/page.tsx](src/app/(auth)/signup/page.tsx) | 이메일·닉네임·비밀번호 한 폼 → 가입 후 인증메일 | 순서가 정반대 |
| [verify-email/page.tsx](src/app/(auth)/verify-email/page.tsx) | 진입 즉시 인증 처리, 결과만 표시 | 인증할 대상 없음. 폼 화면이 되어야 함 |
| [login/page.tsx](src/app/(auth)/login/page.tsx) `UNVERIFIED` | 미인증 안내 + 재발송 유도 | 도달 불가 코드 |
| [auth.ts:140-155](src/app/actions/auth.ts#L140-L155) `loginAction` 에러 분기 | 본문 `code`·`message`로 분기 | 실패는 전부 **401 + 동일 본문** → 단일 처리 |
| `login/page.tsx` `searchParams` | 읽지 않음 | **OAuth 실패 `?error=` 수신 지점이 없음** |
| [types/auth.ts](src/types/auth.ts) `SignUpRequest` | `{email, password, nickname}` | `SignupRequestDto`와 불일치 |

## 2. 생성/수정 파일 목록

| 파일 | 변경 유형 | 내용 |
|---|---|---|
| `src/app/actions/auth.ts` | 수정 | `signupSchema` 재작성, `signupAction` 직접 `fetch` 전환, `verifyEmailAction` 삭제, `resolveVerificationAction` 추가, `sendVerificationEmail` → `requestVerification` |
| `src/app/(auth)/signup/page.tsx` | 수정 | 이메일 단일 입력 + 발송 안내로 축소 |
| `src/app/(auth)/verify-email/page.tsx` | 수정 | 토큰 확인 → 자격증명 폼 → 에러 3상태로 재구성 |
| `src/app/(auth)/verify-email/ResendTicket.tsx` | **삭제** | 어디서도 import되지 않는 죽은 코드. 재발송은 `/signup` 재시작으로 대체 |
| `src/app/(auth)/login/page.tsx` | 수정 | `UNVERIFIED` 분기·재발송 버튼 제거, **`searchParams.error` 배너 추가** |
| `src/types/auth.ts` | 수정 | `SignUpRequest` 제거 후 `SignupRequestDto` 사용 |
| `src/proxy.ts` | 수정 | `verifyToken` 쿼리 감지 → `/verify-email`로 redirect (인증 검사보다 **먼저**) |

Mock 파일은 생성하지 않는다. 실제 백엔드 인증 플로우 연동이며 신규 도메인 컴포넌트가 없다.

## 3. 구현 상세

### 3-1. `signupAction` — `apiClient`를 쓰면 안 된다

`fetchInternal`은 본문만 파싱하고 `Response` 헤더를 호출자에게 넘기지 않는다
([apiClient.ts:90-91](src/api/apiClient.ts#L90-L91)). 201과 함께 오는 `Set-Cookie` 2개가 소실되어
**가입은 성공하는데 로그인은 안 된 상태**가 된다. `loginAction`([auth.ts:133-168](src/app/actions/auth.ts#L133-L168))과
동일하게 직접 `fetch` + `res.headers.getSetCookie()` + 기존 `parseSetCookie`를 쓴다.

```ts
const res = await fetch(`${BASE_URL}/api/auth/users`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ token, nickname, password }),
  cache: "no-store",
});

if (!res.ok) {
  const body = await res.json().catch(() => ({}));
  return mapSignupError(res.status, body);   // 3-2
}

const setCookieHeaders = res.headers.getSetCookie();
if (setCookieHeaders?.length) {
  const cookieStore = await cookies();
  setCookieHeaders.forEach((h) => {
    const parsed = parseSetCookie(h);
    if (parsed) cookieStore.set(parsed.name, parsed.value, parsed.options);
  });
}
```

**`redirect("/")`는 `try` 블록 밖에 둔다.** `redirect()`는 `NEXT_REDIRECT`를 throw하므로 `try` 안에서
호출하면 `catch`가 삼켜 "회원가입 중 오류"를 반환한다 — 가입도 로그인도 성공한 상태인데 화면만 실패로 보인다.
`loginAction`이 [auth.ts:173](src/app/actions/auth.ts#L173)에서 이미 같은 구조를 쓰고 있다.

### 3-2. status별 에러 매핑

실제 응답을 확인한 결과(2026-08-13 실측) 본문 형태는 아래와 같다.

```
410  {"error":"InvalidVerificationTokenException","message":"유효하지 않거나 만료된 인증 링크입니다."}
400  {"error":"InvalidInputException","message":"입력값이 올바르지 않습니다.",
      "validation":{"password":"비밀번호는 영문, 숫자, 특수문자를 포함하여 8~20자로 입력해주세요."}}
400  ... "validation":{"nickname":"닉네임은 1자 이상 20자 이하로 입력해주세요."}   ← 21자
400  ... "validation":{"nickname":"닉네임은 필수입니다."}                          ← 빈 문자열
400  ... "validation":{"token":"인증 토큰은 필수입니다."}                          ← token 누락
```

**모든 본문에 `message` 키가 있다.** 따라서 `apiClient`를 쓰더라도 JSON 원문이 노출되지는 않는다
(초기 계약 공유 시 `message`가 생략된 예시를 받아 그렇게 판단했으나, 실측 결과 아니었다).
`apiClient`를 피하는 이유는 **쿠키 소실(3-1) 하나**이며, 아래 매핑은 원문 노출 차단이 아니라
**필드 단위 안내를 살리기 위한 것**이다. `message`만 쓰면 "입력값이 올바르지 않습니다."로 뭉개져
어느 칸이 틀렸는지 알 수 없다.

| status | 처리 | 화면 문구 |
|---|---|---|
| 400 (`validation.password` · `nickname`) | 필드별 `AuthFormState.errors`에 매핑, 폼 유지 | `validation` 값 그대로 |
| 400 (`validation.token`) | 사용자가 고칠 수 없는 값이므로 410과 동일 처리 | "인증 링크가 만료되었습니다..." |
| 409 | 폼 숨기고 `/login` 버튼 | "이미 가입이 완료된 이메일입니다. 로그인해 주세요." |
| 410 | 폼 숨기고 `/signup` 버튼 | "인증 링크가 만료되었습니다. 처음부터 다시 진행해 주세요." |
| 5xx / 네트워크 | 폼 유지 | "일시적인 오류입니다. 잠시 후 다시 시도해 주세요." |

409·410의 백엔드 `message`는 쓰지 않는다. 409 본문에는 이메일 전체가 담겨 오고,
410 문구에는 다음 행동("처음부터 다시")이 없다.

### 3-3. `resolveVerificationAction` — 이것도 직접 `fetch`

실측 결과 존재하지 않는 토큰에 **410**이 반환되므로(`GET /api/auth/verifications/bogus-token-abc123`)
`apiClient`의 전역 401 리다이렉트에 걸리지는 않는다. 다만 방어적으로 직접 `fetch`를 쓴다 —
401이 섞이면 [apiClient.ts:55-60](src/api/apiClient.ts#L55-L60)에서
계정도 없는 익명 사용자가 로그인 폼으로 떠밀리기 때문이다.
직접 `fetch`로 처리하면 실패 status가 401·404·410 무엇이든 무관해진다.

분기는 **2xx → 폼 표시 / 5xx → 일시 오류 / 그 외 4xx → 링크 무효**. 만료·미존재·이미 사용됨은
Redis 키의 부재로만 관측되므로 백엔드도 구분할 수 없고 프론트 대응도 동일하다.
응답의 `email`은 optional이므로 값이 없으면 이메일 표시줄을 생략한다.

### 3-4. `signupSchema`

```ts
const signupSchema = z.object({
  token: z.string().min(1),
  nickname: z.string().min(1, "닉네임을 입력해주세요.").max(20, "닉네임은 20자 이하여야 합니다."),
  password: z.string().min(8).max(20).regex(/* Task 05 규칙 유지 */),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, { ... });
```

기존 `min(2)` · `max(10)` → `min(1)` · `max(20)`. email 검증은 `/signup` 단계로 분리한다.

### 3-5. 재발송은 `/signup` 하나로 처리한다

만료된 링크에 대한 대응은 "가입을 처음부터 다시"이고, 그것은 `POST /api/auth/verifications` 한 번이다.
재발송과 재시작이 같은 동작이므로 **별도 재발송 UI를 만들지 않는다.**
`ResendTicket.tsx`는 삭제하고, 만료·무효 화면은 `/signup` 버튼만 노출한다.

"다시 보내기"가 필요한 유일한 지점은 `/signup` 제출 직후의 발송 안내 화면이다.
사용자가 방금 이메일을 입력했으므로 재입력 없이 같은 액션을 한 번 더 호출한다.
이 버튼에 **전송 중 비활성화 + 60초 쿨다운**을 둔다(메일 남발 방지).
안내 문구에는 **유효시간 1시간**을 명시하고, "이전 링크는 사용할 수 없습니다" 류는 넣지 않는다.

### 3-6. 완료 후 뒤로 가기

가입 성공 시 이미 로그인 상태다. 뒤로 가기로 `/verify-email?token=`에 재진입하면 409/410이 오지만,
만료 안내 대신 **로그인 상태를 감지해 `/`로 되돌린다.** 토큰이 URL에 남으므로 성공 시 `router.replace`로 쿼리를 제거한다.

### 3-7. `proxy.ts` — 메일 링크 진입 처리

메일 링크는 `https://{프론트}/?verifyToken=abc` 로 온다. 백엔드는 origin과 이 쿼리 이름만 알고,
**어느 화면으로 보낼지는 미들웨어가 정한다.**

```ts
const verifyToken = request.nextUrl.searchParams.get("verifyToken");
if (verifyToken) {
  const url = new URL("/verify-email", request.url);
  url.searchParams.set("token", verifyToken);
  return NextResponse.redirect(url);
}
```

**미들웨어 최상단에 둔다.** `/`는 인증 보호 경로라서, 아래쪽 인증 검사가 먼저 돌면
로그인하지 않은 신규 가입자가 `/login`으로 튕긴다. 공개 경로 목록(`proxy.ts:80-82`) 판정보다도 앞이다.

rewrite가 아니라 **redirect**를 쓴다. 주소가 `/verify-email`로 바뀌므로 기존 공개 경로 판정이
자연스럽게 적용되고, 이후 새로고침·뒤로가기 동작도 예측 가능해진다.

`requestVerification` 액션은 더 이상 `redirectPage`를 보내지 않는다(백엔드가 DTO에서 제거).

### 3-8. OAuth 실패 배너 (`/login`)

백엔드가 실패 시 프론트로 리다이렉트하므로 로그인 페이지가 `searchParams`를 읽어야 한다.

```ts
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  email_not_verified: "구글에서 이메일 인증이 완료되지 않은 계정입니다",
  failed: "로그인에 실패했습니다. 잠시 후 다시 시도해주세요",
};

const message = error ? (OAUTH_ERROR_MESSAGES[error] ?? OAUTH_ERROR_MESSAGES.failed) : null;
```

- **쿼리가 아예 없으면 배너를 띄우지 않는다.** 동의 화면에서 취소한 경우이며 오류가 아니다
- 모르는 값은 `failed`와 동일 처리 (위 `??` fallback)
- 배너는 로그인 폼 실패 메시지와 **같은 영역을 공유하지 않도록** 분리한다. OAuth 실패와 폼 실패는 원인이 다르다

> Task 39가 세션 만료 사유를 같은 페이지에 `?reason=`으로 전달할 예정이다.
> `error`(OAuth) / `reason`(세션)로 키가 분리되어 있어 충돌하지 않는다. 두 태스크가 만나면 배너 렌더링만 통합한다.

### 3-9. `loginAction` 에러 분기 단일화

로그인 실패는 미가입·구글 전용 계정·비밀번호 불일치를 가리지 않고 **401 + 동일 본문**이다.
본문 `code`·`message`를 읽어 분기하던 코드를 제거하고 고정 문구 하나로 처리한다.

```ts
if (!res.ok) {
  return { message: "아이디 또는 비밀번호가 일치하지 않습니다." };
}
```

`UNVERIFIED` 분기와 그에 딸린 재발송 버튼·`showResendButton` 상태도 함께 제거한다.
계정 열거 방지가 목적이므로 **프론트가 사유를 추측해 문구를 세분화하면 안 된다.**

## 4. 검증 방법 — 토큰을 어떻게 얻는가

**에이전트는 메일함을 열 수 없다.** 토큰은 메일로만 전달되므로 이 점이 검증 가능 범위를 가른다.

**해결: 로컬 Redis에서 직접 읽는다.** `dunbar-redis` 컨테이너가 `localhost:6379`에 떠 있고 읽기가 가능하다.
인증을 접수하면 `token → email` 키가 생기므로 메일 없이 토큰을 얻을 수 있다.

```bash
docker exec dunbar-redis redis-cli --scan --pattern 'account:signup:*'
# → account:signup:019ffad2-dd48-7e9e-b7f1-6eb55895ca11
#   콜론 뒤 UUID가 토큰. /?verifyToken=<UUID> 로 진입
```

실측 확인(2026-08-13): 백엔드는 `dunbar-redis`(6379)를 사용하고, 키는 `account:signup:{token}` 형식,
값은 이메일 주소, TTL은 3600초다. `GET`은 토큰을 소비하지 않는다(호출 후 `EXISTS` = 1).
옵션은 `--pattern`이다(`--match`는 인식되지 않는다).

**미가입 주소를 써야 한다.** 이미 가입된 주소로 접수하면 201이 오지만 **토큰이 생성되지 않아**
검증을 진행할 수 없다(계정 열거 방지 동작). 가입 여부는 아래로 확인한다.

```bash
docker exec dunbar-mysql mysql -uroot -p'normalizeHorizon!' dunbar_horizon \
  -e "SELECT user_id, email, status FROM users WHERE email = '<주소>';"
```
**이메일 주소는 실제 수신 가능한 주소를 쓴다**(Gmail 별칭 등). 메일을 읽지는 않지만,
발송 실패 경로를 타면 토큰 생성 여부가 달라질 수 있어서다.
브라우저 조작·스크린샷은 설치된 Playwright로 수행한다.

### 사용자 확인이 필요한 항목 (메일함 필요, 백엔드 배포 후 1회)

에이전트가 검증할 수 없어 결과만 공유받는다.

1. ~~인증 메일이 실제로 도착하는가~~ → **확인됨** (2026-08-13)
2. ~~메일 속 링크 형식~~ → **확인됨.** `http://localhost:3000/?verifyToken=019ffad2-...`
   경로 없이 origin + 쿼리만. 백엔드 수정 반영 완료
3. ~~이미 가입된 주소로 접수했을 때 가입 링크가 아닌 안내 메일이 가는가~~ → **확인됨**
   (`hj02117@naver.com`은 가입 계정 `user_id=296`. 201 응답 + 토큰 미생성 + 안내 메일 수신)

나머지 시나리오는 전부 에이전트가 자동 검증한다.

## 5. 단계별 테스트 시나리오 (TESTING_RULES 기반)

### Phase 1: 정적 분석

- `npx tsc --noEmit` 에러 없음
- `npm run lint` 에러 없음
- `PATCH /api/auth/verifications` · `SignUpRequest.email` 잔존 참조 0건
- 성공 시 커밋: `feat(task-40): 토큰 기반 회원가입 플로우 전환`

### Phase 2: UI 및 상태 검증

매 시나리오마다 미가입 주소가 필요하므로 **Gmail 별칭**(`hj02114+t40a@gmail.com` 식)을 바꿔가며 쓰고,
토큰은 위 4절대로 Redis에서 읽는다.
"이미 가입된 이메일" 상태가 필요한 시나리오는 `POST /api/dev/users`(더미 계정 생성)로 사전 조건을 만든다.

- **인증 요청**: `/signup`에서 이메일 입력 → 발송 안내 + 유효시간 1시간 표시, 메일 수신 확인
  - 안내 문구에 "이미 가입된 계정이라면 로그인 안내 메일이 갑니다"가 포함될 것
  - 스크린샷: `harness/verify/verify-40-01-signup-request.png`
- **링크 진입**: 메일 링크(`/?verifyToken=`) 클릭 → **로그인 화면으로 튕기지 않고** `/verify-email?token=`으로
  이동, 가입 이메일이 읽기 전용으로 표시되고 폼이 열림 (미들웨어 순서 검증)
  - 스크린샷: `harness/verify/verify-40-02-credential-form.png`
- **가입 완료 = 자동 로그인**: 닉네임·비밀번호 입력 → 201 → **쿠키 2개 확인 후 `/` 진입**, 새로고침해도 로그인 유지
  - 스크린샷: `harness/verify/verify-40-03-auto-login.png`
- **비밀번호 검증**: Task 05 규칙(8~20자·영문·숫자·특수문자)이 프론트에서 먼저 차단
- **닉네임 경계값**: 1자 통과 / 20자 통과 / 21자 차단
- **OAuth 회귀**: 구글 버튼 → 계정 자동 생성 → 쿠키 세팅 후 메인 진입
- **로그인 실패 단일 문구**: 미가입 이메일 / 구글 전용 계정 / 틀린 비밀번호 **세 경우 모두 동일한 문구**가 뜰 것
  (사유가 드러나면 계정 열거가 가능해진다)
- 성공 시 커밋

### Phase 3: 예외 상황

- **여러 링크 공존**: 같은 주소로 3회 접수 → Redis에 토큰 키 3개 생성 확인 →
  **세 토큰 모두 폼이 정상적으로 열림** (만료 안내가 뜨면 안 됨)
- **다른 링크로 재가입(409)**: 링크 A로 가입 완료 → 로그아웃 → 링크 B 제출 → **410이 아닌 409**,
  "이미 가입이 완료된 이메일입니다" + 로그인 유도. 백엔드 원문 메시지 미노출
  - 스크린샷: `harness/verify/verify-40-04-already-registered.png`
- **만료 토큰(410)**: `/verify-email?token=존재하지않는값` 진입 → **로그인 페이지로 튕기지 않고**
  만료 안내 + `/signup` 버튼. 만료와 미존재는 백엔드에서 구분되지 않으므로 **1시간을 기다릴 필요 없이
  임의 문자열로 즉시 검증 가능**하다
- **GET 성공 후 POST 실패**: 폼을 연 상태에서 다른 탭으로 같은 토큰의 가입을 완료시킨 뒤 제출 →
  409를 **폼 내부에서** 처리(페이지 전체를 오류 화면으로 날리지 않음). TTL 만료로 인한 410도 같은 경로다
- **서버 400 표시**: Zod를 우회한 요청이 400을 받았을 때 **JSON 원문이 아니라** 필드별 한국어 문구 표시
- **변조 토큰 / `token` 없음**: 오류 화면, 서버 에러 원문 미노출
- **기가입 이메일 접수**: 이미 가입된 주소로 `/signup` 제출 → 평소와 동일한 안내 (안내 메일이 실제로 도착)
- **다시 보내기 연타**: `/signup` 발송 안내 화면에서 연속 클릭 → 쿨다운으로 차단되어 메일이 한 통만 발송
- **완료 후 뒤로 가기**: 가입 완료 → 뒤로 가기 → 만료 안내가 아니라 `/`로 복귀
- **동시 제출**: 같은 토큰으로 두 탭 동시 제출 → 하나만 201, 다른 하나는 410 또는 409
- **OAuth 취소**: 구글 동의 화면에서 취소 → `/login`(쿼리 없음) → **에러 배너가 뜨지 않을 것**
- **OAuth 실패 배너**: `/login?error=email_not_verified` 직접 진입 → "구글에서 이메일 인증이..." 표시,
  `?error=failed` → "로그인에 실패했습니다..." 표시
  - 스크린샷: `harness/verify/verify-40-05-oauth-error.png`
- **알 수 없는 `error` 값**: `/login?error=zzz` → `failed`와 동일 문구 (빈 배너·크래시 없음)
- **로그인 상태에서 메일 링크 진입**: 이미 로그인한 브라우저로 `/?verifyToken=` 진입 →
  미들웨어가 `/verify-email`로 보내고, 페이지가 로그인 상태를 감지해 `/`로 되돌림 (3-6)
- **기존 라우팅 회귀**: `verifyToken` 없는 일반 요청(`/`, `/flags/1` 등)이 평소대로 동작하고
  미들웨어 인증 흐름에 영향이 없을 것
- 성공 시 최종 커밋 및 작업 완료 보고
