# PLAN: Task 42 — apiClient 실패 정규화

배경·설계 근거는 `harness/tasks/42-api-failure-normalization.md` 참고.

## 1. 영향 범위

**한 파일을 고치는데 앱 전체가 영향권이다.** 성공 조건은 "동작이 바뀌지 않는 것".

| 소비처 | 규모 | 실패를 다루는 방식 |
|---|---|---|
| Server Action 8파일 | 호출 74건 | `message` 통과 20 / 고정 문구 29 / 빈 배열 14 |
| 페이지 12파일 | — | 전부 `if (isRedirectError(error)) throw error` — **에러를 들여다보지 않는다** |
| orval generated | 19파일 | `customFetch` 경유, 런타임 미사용 |

페이지는 에러 내용을 참조하지 않으므로 타입이 바뀌어도 안전하다.
액션은 `message` 하위 호환으로 그대로 동작한다.

## 2. 수정할 파일

| 파일 | 변경 |
|---|---|
| `src/api/apiClient.ts` | 타입 정의 + `fetchInternal` 정규화 |
| `src/app/actions/auth.ts` | 로컬 `ApiErrorBody` 제거 후 import (타입만) |

Mock 파일 없음. 신규 UI가 없는 전송 계층 단독 변경이다.

## 3. 구현

### 1단계 — 타입과 문구 상수

```ts
export type FailureKind = "http" | "network" | "timeout" | "parse";

export interface ApiErrorBody {        // auth.ts:121 에서 이동
  error?: string;
  message?: string;
  validation?: Record<string, string>;
}

export class ApiError extends Error {
  readonly kind: FailureKind;
  readonly status?: number;
  readonly code?: string;              // 로그·진단 전용
  readonly validation?: Record<string, string>;
  readonly detail?: unknown;           // 원본 보존, 화면 노출 금지
}
```

| 상수 | 문구 |
|---|---|
| `SERVER_ERROR` | 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요. |
| `NETWORK_ERROR` | 네트워크 연결을 확인해 주세요. |
| `TIMEOUT_ERROR` | 요청 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요. |
| `CLIENT_ERROR` | 요청을 처리할 수 없습니다. |

### 2단계 — 비-2xx 경로 ([apiClient.ts:65-86](src/api/apiClient.ts#L65-L86))

```ts
if (!response.ok) {
  const raw = await response.text();            // 본문을 한 번만 읽는다
  let body: ApiErrorBody = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch { /* HTML 502 등 */ }

  const message = response.status >= 500 ? SERVER_ERROR : body.message ?? CLIENT_ERROR;

  throw new ApiError(message, {
    kind: "http", status: response.status,
    code: body.error, validation: body.validation, detail: raw,
  });
}
```

**잠재 버그 하나가 같이 사라진다.** 현재 코드는 `response.json()`이 실패하면 catch에서
`response.text()`를 다시 부르는데, 본문이 이미 소비되어 그 호출도 실패한다.

401 → `redirect("/login")`은 이 블록보다 **위**에 있으므로 손대지 않는다.

### 3단계 — 성공 응답의 파싱 실패

```ts
const text = await response.text();
if (!text) return {} as TResult;
try { return JSON.parse(text) as TResult; }
catch (e) { throw new ApiError(SERVER_ERROR, { kind: "parse", status: response.status, detail: e }); }
```

지금은 `SyntaxError`가 그대로 올라가 영문 파서 에러가 화면에 뜬다.

### 4단계 — catch 경로 ([apiClient.ts:92-101](src/api/apiClient.ts#L92-L101))

```ts
} catch (error) {
  if (isRedirectError(error)) throw error;              // 반드시 최우선 유지
  const failure = error instanceof ApiError ? error : classifyTransportError(error);
  if (!options.silent) {
    console.error(`[apiClient] ${method} ${endpoint} → ${failure.kind}`
      + (failure.status ? ` ${failure.status}` : "")
      + (failure.code ? ` ${failure.code}` : ""), failure.detail ?? failure.message);
  }
  throw failure;
}
```

`classifyTransportError`는 `name`이 `AbortError`/`TimeoutError`이거나 `cause.code`에
`TIMEOUT`이 있으면 `timeout`, 아니면 `network`로 분류한다.
**원본 문자열은 `detail`에만 넣는다.** `message`에는 들어가지 않는다 — 이 한 줄이
`fetch failed` 노출을 끝낸다.

기본 타임아웃을 새로 거는 것은 동작 변경이라 범위 밖이다.

### 5단계 — `auth.ts` 정리

로컬 `ApiErrorBody`를 지우고 `apiClient`에서 import한다. raw `fetch` 구조는 유지한다.

## 4. 검증

### Phase 1 — 정적 분석

- `npx tsc --noEmit`, `npm run lint`
- **호출부 무변경 확인** — 작업 전후 값이 같아야 한다

```bash
grep -rn "instanceof Error" src/app/actions | wc -l                              # 20
grep -rn "apiClient\.\(get\|post\|put\|patch\|delete\)" src/app/actions | wc -l  # 74
```

### Phase 2 — 회귀 스모크

기준 계정: 이수환 / leesuhwan@test.com / String123! (user_id=4)
**실패 문구가 작업 전과 같아야 한다.**

| 도메인 | 확인 |
|---|---|
| 그래프·친구 / Profile / Notification | 정상 렌더 |
| Buzz / Label | 목록·작성 정상 |
| **Flag** | 종료된 Flag 탈퇴 → **"모집 기간이 종료된 이후에는 참여를 취소할 수 없습니다."** |

Flag 문구는 Task 41에서 정확한 문자열이 기록돼 있어 회귀 판정 기준으로 쓴다.
스크린샷 → `harness/verify/verify-42-*.png`

### Phase 3 — 본체

4xx 외에는 실제 백엔드로 재현이 어렵다. **스텁 서버 + `NEXT_PUBLIC_API_URL`을 돌린
별도 dev 인스턴스**로 검증한다. 운영 중인 스프링은 건드리지 않는다.

| 케이스 | 스텁 응답 | 기대 |
|---|---|---|
| 5xx 본문 불신 | `500 {"message":"java.lang.NullPointerException"}` | 예외 문자열이 아닌 `SERVER_ERROR` |
| 비-JSON | `502` + HTML | HTML이 화면에 안 뜸 |
| 4xx 통과 | `409 {"error":"X","message":"한국어"}` | 그 문구 그대로 |
| `message` 없는 4xx | `400 {"validation":{...}}` | JSON 원문이 아닌 `CLIENT_ERROR` |
| 네트워크 실패 | 스텁 중지 | `fetch failed` 대신 `NETWORK_ERROR` |

실제 백엔드로 추가 확인:

- **401** — 쿠키 제거 후 접근 → `redirect("/login")` 정상. **최대 회귀 위험**
- `UnAuthorizedException` 류 문자열이 어떤 화면에도 없을 것

Phase별 커밋. **push는 하지 않는다.**

## 5. 리스크

| 리스크 | 대응 |
|---|---|
| 401 리다이렉트가 `ApiError`에 삼켜짐 | `isRedirectError`를 catch 최우선 유지 + Phase 3 실측 |
| `message` 하위 호환이 깨져 문구가 바뀜 | 4xx는 `body.message` 그대로 — 현재와 동일 규칙. Phase 2에서 대조 |
| `message` 없는 4xx의 문구 변화 | 의도된 변경(JSON 원문 → 한국어). 빈도 낮고 개선 방향이라 수용 |
| `class extends Error`의 `instanceof` | target ES2017이라 네이티브 class로 컴파일됨. Phase 1에서 확인 |

## 6. 브랜치

`agent/task-42-api-failure-normalization` (main에서 분기, Task 41 병합 완료 상태).
