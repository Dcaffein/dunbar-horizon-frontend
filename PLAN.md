# PLAN: Task 42 — apiClient 실패 정규화

배경·목적·설계 근거는 `harness/tasks/42-api-failure-normalization.md` 참고.
이 문서는 **구현 절차와 검증**을 다룬다.

## 1. 작업 성격과 영향 범위

**한 파일(`src/api/apiClient.ts`)을 고치는데 앱 전체가 영향권에 있다.**
그래서 이 태스크의 성공 조건은 기능 추가가 아니라 **"동작이 바뀌지 않는 것"** 이다.

| 소비처 | 수 | 실패를 다루는 방식 |
|---|---|---|
| Server Action (`src/app/actions/*.ts`) | 8파일 · 호출 74건 | `message` 통과 20 / 고정 문구 29 / 빈 배열 14 |
| 페이지 (`src/app/**/page.tsx`) | 12파일 | 전부 `catch (error) { if (isRedirectError(error)) throw error; }` — **에러를 들여다보지 않는다** |
| orval generated (`customFetch` 경유) | 19파일 | 런타임 미사용 |

페이지 12곳은 에러 내용을 전혀 참조하지 않으므로 타입이 바뀌어도 안전하다.
액션 쪽도 `ApiError extends Error`이고 `message`를 같은 자리에 같은 방식으로 채우면
`error instanceof Error ? error.message : "..."` 패턴이 그대로 동작한다.
**하위 호환이 유일한 안전장치다.**

## 2. 생성/수정할 파일

| 파일 | 변경 |
|---|---|
| `src/api/apiClient.ts` | `FailureKind`·`ApiErrorBody`·`ApiError` 정의, `fetchInternal` 정규화 |
| `src/app/actions/auth.ts` | 로컬 `ApiErrorBody` 정의 제거 후 import (타입만, 동작 무변경) |

Mock 파일 없음. 신규 UI가 없고 전송 계층 단독 변경이다.

## 3. 구현 단계

### 1단계 — 타입 정의

```ts
export type FailureKind = "http" | "network" | "timeout" | "parse";

// auth.ts:121 에서 이동 — 신규 정의가 아니다
export interface ApiErrorBody {
  error?: string;                       // 내부 예외 클래스명 — 분기 전용, 렌더링 금지
  message?: string;                     // 표시용 한국어 문장
  validation?: Record<string, string>;
}

export class ApiError extends Error {
  readonly kind: FailureKind;
  readonly status?: number;             // kind === "http" 일 때만
  readonly code?: string;               // = 백엔드 error 필드
  readonly validation?: Record<string, string>;
  readonly detail?: unknown;            // 원본 보존 (로깅용, 화면 노출 금지)
}
```

FE가 소유하는 고정 문구는 상수로 모은다.

| 상수 | 문구 |
|---|---|
| `SERVER_ERROR` | 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요. |
| `NETWORK_ERROR` | 네트워크 연결을 확인해 주세요. |
| `TIMEOUT_ERROR` | 요청 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요. |
| `CLIENT_ERROR` | 요청을 처리할 수 없습니다. (4xx인데 `message`가 없을 때) |

### 2단계 — 응답 경로 정규화 ([apiClient.ts:65-86](src/api/apiClient.ts#L65-L86))

```ts
if (!response.ok) {
  const raw = await response.text();                 // ← 본문을 한 번만 읽는다
  let body: ApiErrorBody = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch { /* HTML 502 등 */ }

  const message = response.status >= 500
    ? SERVER_ERROR                                   // 5xx 본문은 신뢰하지 않는다
    : body.message ?? CLIENT_ERROR;

  throw new ApiError(message, {
    kind: "http", status: response.status,
    code: body.error, validation: body.validation, detail: raw,
  });
}
```

**부수적으로 잠재 버그 하나가 사라진다.** 현재 코드는 `response.json()`이 실패하면
`catch`에서 `response.text()`를 다시 부르는데, 본문은 이미 소비되어 그 호출도 실패한다.
`text()`를 먼저 읽고 파싱을 시도하는 방식으로 바꾸면 해결된다.

401 → `redirect("/login")`은 이 블록보다 **위에** 있으므로 손대지 않는다.

### 3단계 — 성공 경로의 파싱 실패

```ts
const text = await response.text();
if (!text) return {} as TResult;
try { return JSON.parse(text) as TResult; }
catch (e) { throw new ApiError(SERVER_ERROR, { kind: "parse", status: response.status, detail: e }); }
```

지금은 `JSON.parse` 실패가 raw `SyntaxError`로 호출자에게 올라가고,
`message`를 통과시키는 20곳에서 **영문 파서 에러가 화면에 뜬다.**

### 4단계 — catch 경로 정규화 ([apiClient.ts:92-101](src/api/apiClient.ts#L92-L101))

```ts
} catch (error) {
  if (isRedirectError(error)) throw error;           // ← 반드시 최우선 유지
  const failure = error instanceof ApiError ? error : classifyTransportError(error);
  if (!options.silent) console.error(`[apiClient] ${method} ${endpoint} → ${failure.kind}`, failure.detail ?? failure.message);
  throw failure;
}
```

`classifyTransportError`는 `name`이 `AbortError`/`TimeoutError`이거나
`cause.code`에 `TIMEOUT`이 있으면 `timeout`, 아니면 `network`로 분류한다.

이 단계가 **`fetch failed` / `The operation was aborted due to timeout` 노출을 없앤다.**
기본 타임아웃을 새로 거는 것은 동작 변경이라 범위 밖이다(`timeout` 분류는 호출자가
`signal`을 넘기거나 undici가 타임아웃을 던질 때를 위해 남겨둔다).

### 5단계 — `auth.ts` 정리

로컬 `ApiErrorBody` 정의를 지우고 `apiClient`에서 import한다.
`auth.ts`는 401 전역 리다이렉트와 `Set-Cookie` 때문에 raw `fetch`를 쓰는 구조를
**그대로 유지한다.** 타입만 공유한다.

## 4. 테스트 시나리오 (`harness/TESTING_RULES.md`)

### Phase 1 — 정적 분석

- `npx tsc --noEmit`, `npm run lint` (변경 파일 기준 클린)
- **호출부 무변경 확인** — 작업 전후 값이 같아야 한다

```bash
grep -rn "instanceof Error" src/app/actions | wc -l      # 20
grep -rn "apiClient\.\(get\|post\|put\|patch\|delete\)" src/app/actions | wc -l   # 74
```

- 통과 시 1차 커밋

### Phase 2 — 회귀 스모크 (동작이 바뀌지 않았음을 확인)

기준 계정: 이수환 / leesuhwan@test.com / String123! (user_id=4)
**도메인마다 정상 흐름 1개 + 실패 흐름 1개.** 실패 문구가 작업 전과 같아야 한다.

| 도메인 | 정상 | 실패 |
|---|---|---|
| 그래프·친구 | 메인 진입, 노드 조회 | — |
| Flag | 상세·댓글·메모리얼 | 종료된 Flag 탈퇴 → **"모집 기간이 종료된 이후에는 참여를 취소할 수 없습니다."** (Task 41에서 확인된 문구 그대로) |
| Buzz | 목록·작성 | 댓글 실패 문구 동일 |
| Label | 목록 | 생성 실패 문구 동일 |
| Profile | 내 프로필 / 공개 프로필 | — |
| Notification | 목록 | — |

Flag 실패 문구는 Task 41에서 **정확한 문자열이 기록돼 있어** 회귀 판정 기준으로 쓴다.
스크린샷 → `harness/verify/verify-42-*.png`. 통과 시 2차 커밋

### Phase 3 — 이 태스크의 본체

4xx를 제외한 나머지는 실제 백엔드로 재현하기 어렵다.
**스텁 서버를 띄우고 `NEXT_PUBLIC_API_URL`을 그쪽으로 돌린 별도 dev 인스턴스**로 검증한다.
운영 중인 스프링을 건드리지 않는다.

| 케이스 | 스텁 응답 | 기대 |
|---|---|---|
| 5xx 본문 불신 | `500 {"message":"java.lang.NullPointerException"}` | 화면에 **예외 문자열이 아닌** `SERVER_ERROR` 문구 |
| 비-JSON 응답 | `502` + HTML | `kind="parse"` 또는 `http`, HTML이 화면에 안 뜸 |
| 4xx 통과 | `409 {"error":"X","message":"한국어 문구"}` | 그 문구가 그대로 표시 (기존 동작 유지) |
| 4xx `message` 없음 | `400 {"validation":{...}}` | JSON 원문이 아닌 `CLIENT_ERROR` |
| 네트워크 실패 | 스텁 중지 | **`fetch failed` 대신** `NETWORK_ERROR` |

추가로 실제 백엔드에서:

- **401** — 쿠키 제거 후 접근 → `redirect("/login")` 정상 동작. **이 태스크 최대 회귀 위험**
- **`code` 미노출** — 어떤 화면에도 `UnAuthorizedException` 류 문자열이 없어야 한다

통과 시 최종 커밋. **push는 하지 않는다.**

## 5. 리스크

| 리스크 | 대응 |
|---|---|
| 401 리다이렉트가 `ApiError`에 삼켜짐 | `isRedirectError`를 catch 최우선에 유지. Phase 3에서 명시 검증 |
| `message` 하위 호환이 깨져 49곳 문구가 바뀜 | 4xx는 `body.message` 그대로 — 현재와 동일 규칙. Phase 2에서 도메인별 문구 대조 |
| 4xx 중 `message` 없는 응답의 문구가 바뀜 | 의도된 변경(JSON 원문 → 한국어). 발생 빈도가 낮고 개선 방향이라 수용 |
| `class extends Error` 의 `instanceof` | target ES2017이라 네이티브 class로 컴파일되어 정상. Phase 1에서 확인 |
| 스텁 검증이 실제 환경과 다름 | 스텁은 5xx·비JSON·네트워크 전용. 4xx·401은 실제 백엔드로 검증 |

## 6. 브랜치

`agent/task-41-flag-api-url-refactor`가 아직 main에 병합되지 않았다.
Phase 2에서 Flag 흐름을 회귀 기준으로 쓰므로 **41 브랜치에서 분기**한다.

```
agent/task-41-flag-api-url-refactor → agent/task-42-api-failure-normalization
```

41을 먼저 병합하기로 하면 그때 main에서 분기한다. Phase별로 커밋해 롤백 지점을 남긴다.
