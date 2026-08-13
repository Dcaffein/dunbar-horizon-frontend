# Task 39: JWT 재발급 실패 응답 계약 및 프론트 분기 정비

## 배경

백엔드가 `PATCH /api/auth/tokens`(토큰 재발급)의 예외 응답을 리팩토링 중이다.
논의의 출발점은 "`refresh_token` 쿠키가 아예 없을 때 401(`RefreshTokenNotFoundException`)이 맞는가,
프론트가 **만료**와 **없음**을 구분해야 하는가"였다.

현재 프론트 코드를 확인한 결과, **재발급 실패 사유가 프론트에 도달하는 정보량이 0비트**다.
백엔드 응답 계약을 아무리 정교하게 만들어도 아래 4개 지점에서 전부 소실된다.

### 현재 분기 실태 (`src/proxy.ts`)

| # | 지점 | 현재 동작 | 문제 |
|---|---|---|---|
| ① | `proxy.ts:98` | `if (refreshToken)` — 쿠키 없으면 백엔드 호출 자체를 하지 않음 | `RefreshTokenNotFoundException`은 미들웨어 경로에서 발생 불가 |
| ② | `proxy.ts:50-52` | `if (!response.ok) return null` | status code 미확인, `response.json()` 미호출로 body를 읽지도 않음. 401/400/5xx가 전부 동일 |
| ③ | `proxy.ts:56-58` | `Set-Cookie` 없으면 `null` | "갱신 실패"와 "갱신 성공했으나 쿠키 파싱 실패"가 구분되지 않고 로그도 없음 |
| ④ | `proxy.ts:151-174` | 실패 시 단일 분기 | 사유가 아니라 요청 종류(`Next-Action` 헤더)로만 갈림. 양쪽 모두 쿠키 삭제 |

추가로 `proxy.ts:152`에서 `callbackUrl`을 붙이지만 `src/app/(auth)/login/page.tsx`가
`searchParams`를 전혀 읽지 않아 **로그인 후 원래 페이지 복귀가 동작하지 않는다.**

### 만료 판정 주체

`proxy.ts:6-39`의 `isTokenExpired()`가 access token을 base64 디코딩해 `exp`를 직접 읽는다.
서명 검증 없이 프론트 서버 시계 기준으로 판정하며(10초 버퍼), 백엔드 401을 기다리지 않는다.
`src/api/apiClient.ts:55-60`은 백엔드 401을 받으면 재발급 시도 없이 즉시 `redirect("/login")`한다.

즉 **선제 판정은 프론트가 단독으로, 사후 401은 재발급 없이 로그아웃**으로 처리된다.

## 핵심 설계 원칙

- **동작은 status로, 문구는 code로**: 프론트의 분기(쿠키 삭제 여부 / 재로그인 여부)는 HTTP status로 결정한다. body의 error code는 안내 문구와 로깅에만 쓴다.
- **"만료 vs 없음" 구분은 프론트에 실익이 없다**: 둘 다 대응이 "재로그인"으로 동일하고, "없음"은 ①때문에 프론트까지 도달하지도 않는다. `RefreshTokenNotFoundException` → 401 유지가 맞다.
- **실제로 필요한 구분은 "재로그인 필요(4xx)" vs "일시적 장애(5xx)"**: 현재 ②④ 때문에 백엔드 재시작·일시 장애 시 접속 중인 모든 사용자의 쿠키가 삭제되어 로그아웃된다. 이 결함의 체감 피해가 만료/없음 구분보다 훨씬 크다.
- **실패는 사유를 남긴다**: 프론트 서버 로그와 브라우저 전달 경로 양쪽에 사유가 남아야 한다.

## 백엔드 확정 계약 (2026-08-13 전달 — 아래 제안을 대체한다)

Task 40 배포에 함께 나갔다. 아래 「제안」 테이블은 **채택되지 않았다.**

| 상황 | status | 프론트 대응 |
|---|---|---|
| 쿠키 없음 · 만료 · 위조 | **401** (기존 500에서 변경) | 쿠키 삭제 + 재로그인 |
| **토큰 재사용 감지** | **403** | 서버가 해당 유저의 refresh 토큰을 **전량 삭제**하므로 재로그인 필수 |
| 서버 장애 | 5xx | **쿠키 유지** (이 태스크의 핵심 변경) |

세부 error code는 내려오지 않는다. **분기는 status만으로 한다** — 이 태스크가 세운
"동작은 status로" 원칙과 일치하며, code 기반 문구 세분화는 범위에서 제외한다.

재사용 감지가 403으로 별도 구분되므로 「미확인 사항 1」의 rotation 정책은 **reuse detection 있음**으로 확정된다.
동시 재발급 시 토큰 패밀리 전체가 폐기될 수 있으므로 **재발급 중복 방지가 필요하다.**

로그인 페이지에 `?reason=`을 붙이는 계획은 유지하되, Task 40이 OAuth 실패를 `?error=`로 받는다.
키가 분리되어 충돌하지 않으며, 두 태스크가 만나면 배너 렌더링만 통합한다.

## 백엔드 응답 계약 (제안 — 폐기됨)

status는 401로 통일하고 세부 사유는 body code로 내려준다.

| 상황 | status | code |
|---|---|---|
| `refresh_token` 쿠키 없음 | 401 | `REFRESH_TOKEN_MISSING` |
| 만료 | 401 | `REFRESH_TOKEN_EXPIRED` |
| 서명 불일치 / 위변조 | 401 | `REFRESH_TOKEN_INVALID` |
| 폐기됨 (로그아웃 · 재사용 감지) | 401 | `REFRESH_TOKEN_REVOKED` |
| 서버 장애 | 5xx | — |

body 형태는 기존 에러 응답과 동일하게 `{ code, message }`를 따른다.

### 프론트 대응 매핑

| 백엔드 응답 | 쿠키 | 이동 | 사용자 안내 |
|---|---|---|---|
| 401 `REFRESH_TOKEN_MISSING` | 삭제 | `/login` | 안내 없음 (로그인 안 한 상태와 동일) |
| 401 `REFRESH_TOKEN_EXPIRED` | 삭제 | `/login?reason=expired` | "세션이 만료되었습니다. 다시 로그인해 주세요." |
| 401 `REFRESH_TOKEN_INVALID` | 삭제 | `/login?reason=invalid` | "로그인 정보가 유효하지 않습니다." |
| 401 `REFRESH_TOKEN_REVOKED` | 삭제 | `/login?reason=revoked` | "다른 기기에서 로그아웃되었습니다." |
| 5xx / 네트워크 오류 | **유지** | 이동 없음 | "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." |

**5xx에서 쿠키를 유지하는 것이 이번 작업의 핵심 변경이다.** refresh token은 아직 유효한데
백엔드 장애만으로 세션을 파기하면 안 된다.

## 미확인 사항 (백엔드 확인 필요)

### 1. refresh token rotation 정책

동시 재발급 요청이 발생했을 때 결과가 정책에 따라 갈린다. 이 레포에는 판단 근거가 없다.

| 정책 | 동시 요청 결과 |
|---|---|
| rotation 없음 | 둘 다 성공, 무해 |
| rotation, reuse detection 없음 | 늦은 쪽만 실패 → ④의 쿠키 삭제가 먼저 성공한 쪽의 새 토큰까지 지울 수 있음 |
| rotation + reuse detection | 토큰 패밀리 전체 폐기 → 양쪽 모두 로그아웃 |

**확인 방법**: 동일 refresh token으로 `PATCH /api/auth/tokens`를 두 번 호출.
2xx면 1번, 401이면 2번, 이후 첫 응답으로 받은 새 토큰까지 거부되면 3번.

rotation이 있다면(2·3번) 프론트에 **재발급 중복 방지**가 필요하다.
1번이면 이 항목은 범위에서 제외한다.

### 2. `NextResponse.next()` 호출 순서 결함 (실측 검증 필요)

`proxy.ts:102-125`는 `NextResponse.next({ request: { headers: requestHeaders } })`를
**먼저 생성한 뒤** `requestHeaders.set("Cookie", ...)`로 값을 변경한다.
Next.js는 `next()` 호출 시점에 헤더를 `x-middleware-request-*`로 직렬화하므로,
이후 mutation은 다운스트림(RSC / Server Action)에 반영되지 않을 가능성이 높다.

사실이라면 **재발급에 성공해도 현재 요청은 만료된 토큰으로 렌더링 → `apiClient`가 401 → `/login` 리다이렉트**가 된다.
즉 재발급 기능 자체가 "다음 요청부터만" 동작한다.

이 결함은 백엔드 응답 계약과 무관하게 성립하며, 계약 정비보다 우선순위가 높을 수 있다.
착수 전 실측(만료 임박 토큰으로 페이지 진입 → 네트워크 탭에서 재발급 성공 후 리다이렉트 발생 여부)으로 확정한다.

## 작업 범위

### 포함

1. `refreshAccessToken()`이 status와 body code를 반환하도록 변경 (②③)
2. 재발급 실패 시 status 기반 분기 — 4xx는 쿠키 삭제 + 재로그인, 5xx는 쿠키 유지 (④)
3. `/login?reason=`으로 사유 전달 및 로그인 페이지 안내 문구 표시
4. `callbackUrl` 소비 — 로그인 성공 후 원래 페이지로 복귀
5. Server Action / AJAX 경로의 401 응답 body에 실제 사유 code 포함
6. `NextResponse.next()` 호출 순서 수정 (미확인 사항 2가 사실로 확인될 경우)
7. 재발급 중복 방지 (미확인 사항 1이 rotation으로 확인될 경우)

### 제외

- `isTokenExpired()`의 선제 판정 방식 자체 (서명 미검증 포함) — 현행 유지
- `apiClient`의 401 → 재발급 재시도 로직 추가 — 별도 태스크로 분리
- `/api` Route Handler 경로의 토큰 갱신 (`proxy.ts:83`에서 제외됨) — 현행 유지

## 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `src/proxy.ts` | `refreshAccessToken()` 반환 타입을 `{ ok, status, code }`로 변경. 실패 분기를 4xx/5xx로 분리. 5xx는 쿠키 보존. `/login?reason=` 부착. `NextResponse.next()` 호출 순서 수정 |
| `src/types/auth.ts` | `RefreshFailureCode` 유니온 타입 및 `reason` → 안내 문구 매핑 추가 |
| `src/app/(auth)/login/page.tsx` | `searchParams`의 `reason` / `callbackUrl` 소비. 사유 배너 표시 |
| `src/app/actions/auth.ts` | `loginAction`이 `callbackUrl`을 받아 성공 시 해당 경로로 `redirect` |

Mock 파일은 생성하지 않는다. 이 태스크는 미들웨어 인증 흐름 수정이며 신규 UI 컴포넌트가 없다.

## 검증

### Phase 1 — 정적 분석

- `npx tsc --noEmit` 에러 없음
- `npm run lint` 에러 없음

### Phase 2 — UI / State

- **정상 세션**: access token 유효 → 재발급 호출 없이 통과
- **access 만료 + refresh 유효**: 재발급 성공 → **현재 요청이 로그인으로 튕기지 않고 정상 렌더링** (미확인 사항 2 회귀 검증)
- **refresh 만료(401 `REFRESH_TOKEN_EXPIRED`)**: `/login?reason=expired` 이동, "세션이 만료되었습니다" 배너 표시, 쿠키 삭제 확인
- **refresh 쿠키 없음**: `/login` 이동, 배너 없음
- **로그인 후 복귀**: `/flags/1`에서 만료 → 로그인 → `/flags/1`로 복귀
- **Server Action 중 만료**: 401 응답 body에 사유 code 포함 확인

### Phase 3 — Edge Case

- **백엔드 5xx**: 백엔드 중지 후 만료 임박 토큰으로 접근 → **쿠키가 삭제되지 않고** 에러 안내 표시. 백엔드 복구 후 재접근 시 정상 재발급
- **동시 재발급**: 만료된 access token 상태에서 여러 탭 동시 진입 → 백엔드 rotation 정책에 따른 결과 확인. rotation이면 중복 방지 동작 확인
- **200 응답 + `Set-Cookie` 없음**: 프론트 서버 로그에 사유가 남는지 확인
- **`reason` 파라미터 임의 변조**: 알 수 없는 값이면 배너 미표시 (기본값 처리)

## 선행 조건

착수 전 아래 두 가지가 확정되어야 한다.

1. 백엔드의 error code 계약 확정 (위 제안 테이블 승인 또는 수정)
2. refresh token rotation 정책 확인 (미확인 사항 1)
3. `NextResponse.next()` 순서 결함 실측 확인 (미확인 사항 2)

확정 후 `PLAN.md` 작성 → 승인 → `agent/task-39-auth-refresh-failure-contract` 브랜치에서 작업한다.

## Result

_미착수_
