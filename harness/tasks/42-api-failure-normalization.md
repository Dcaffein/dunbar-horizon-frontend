# Task 42: apiClient 실패 정규화

> 구현 절차·검증 방법은 `PLAN.md` 참고.

## 배경

`apiClient`를 통과한 실패가 **호출자에게 세 가지 서로 다른 타입으로 도착한다.** 실측:

```
BE 4xx/5xx 응답 → Error        .message = 백엔드가 준 한국어 문장
연결 거부 / DNS  → TypeError    .message = "fetch failed"
타임아웃         → DOMException .message = "The operation was aborted due to timeout"
```

호출부는 이걸 한 줄로 처리한다.

```ts
const message = error instanceof Error ? error.message : "참여 취소에 실패했습니다.";
```

`TypeError`도 `DOMException`도 `Error`를 상속하므로 이 삼항은 **참**이 된다.
결과적으로 **백엔드가 꺼져 있으면 한국어 UI에 `fetch failed`가 그대로 뜬다.**
백엔드 계약과 무관한 프론트 단독 결함이며, 서버가 표준을 완벽히 지켜도 남는다.

`error.message`라는 자리를 두 종류가 공유하는 것이 원인이다.

| 출처 | 예시 | 화면에 띄워도 되나 |
|---|---|---|
| 서버 계약 | "모집 기간이 지난 깃발입니다." | ○ |
| JS 런타임 | `fetch failed`, `Unexpected token <` | ✗ |

지금 코드는 둘을 구분할 방법이 없다. 타입이 같기 때문이다.

## 목적

**불변식 하나를 만든다.**

> `ApiError.message`는 언제나 사용자에게 보여도 되는 문장이다.

출처 판정은 추측이 아니라 **실패가 흐름의 어디에서 났는지**로 결정된다.
그 위치를 아는 곳은 `apiClient` 한 곳뿐이라, 여기서만 고칠 수 있다.

이 불변식이 서면 호출부는 지금처럼 `.message`를 그대로 띄워도 안전해진다.
**통과 정책을 버리는 게 아니라 성립 조건을 만들어 주는 작업이다.**

## 부수적으로 회복되는 것

지금 `apiClient`는 `status`·`error`·`validation`을 파싱해놓고 전부 버린 뒤
`throw new Error(문자열)` 한다. 호출자에게 남는 정보량은 **1비트(성공/실패)** 다.
정규화하면서 이 값들을 `ApiError`에 실어 보낸다.

**다만 이 태스크는 그 값들로 분기하지 않는다.** 선택지를 만들기만 한다.

## 필드별 역할

| 필드 | 용도 |
|---|---|
| `kind` | `http` / `network` / `timeout` / `parse`. **이 태스크의 목적 그 자체** |
| `status` | **동작 분기의 1차 판단.** 이번엔 로그에만 |
| `code` (=BE `error`) | **로그·진단 전용. 렌더링도 분기도 금지** (아래) |
| `validation` | 폼 필드 바인딩용. 이번엔 보존만, 소비처 없음 |
| `message` | 화면 표시. 위 불변식의 대상 |

`kind`를 명시하는 이유는 필드를 전부 optional로 두면 "`status`가 없다"가 암묵적으로
네트워크 실패를 뜻하게 되고, 그 암묵 규칙이 다음 세대의 문자열 파싱이 되기 때문이다.

`code`로 분기하지 않는 이유는 현재 값이 `FlagDeadlinePassedException` 같은
**자바 클래스 이름**이라서다. 계약이 아니라 구현 세부라 백엔드가 rename하면 프론트가
조용히 깨진다. 분기가 필요해지면 클래스명에 의존하지 말고 안정적인 code 계약을 요청한다.
진단에는 값을 한다 — Task 41에서 신·구 경로가 둘 다 404였을 때
`FlagParticipantNotFound`(리소스 없음)와 `NotFoundException`(경로 없음)을 갈라준 것이 이 필드다.

## message 판정 규칙

| 실패 위치 | `kind` | `message` |
|---|---|---|
| 4xx 응답 + `body.message` | `http` | 서버 문장 그대로 |
| 4xx 응답 + `message` 없음 | `http` | FE 고정 문구 |
| **404 응답** | `http` | **FE 고정 문구 — 본문 불신** (Task 43에서 추가) |
| 5xx 응답 | `http` | **FE 고정 문구 — 본문 불신** |
| 연결 거부 / DNS | `network` | FE 고정 문구 |
| 타임아웃 | `timeout` | FE 고정 문구 |
| 성공 응답의 파싱 실패 | `parse` | FE 고정 문구 |

404를 불신하는 근거는 Task 43에서 실측으로 드러났다 — 백엔드의 404 문구가
`"존재하지 않는 flagMemorial : 99999999"`, `"User(4)와 User(99999999) 사이의..."`,
`"요청하신 경로를 찾을 수 없습니다: api/v1/..."` 처럼 내부 식별자와 API 경로를 담는다.
라우팅 미스와 도메인 예외가 같은 404를 쓰므로 호출부 단위로는 가릴 수 없다.

5xx를 불신하는 근거: 지금 확인된 응답은 전부 서버가 **의도적으로 처리한** 예외다.
처리되지 않은 5xx에서도 `message`가 안전한지는 프론트가 보장할 수 없다.
서버가 이미 안전한 문구를 주더라도 손해가 없고(한 겹 일반화될 뿐), 아니라면 예외 문자열
노출을 막는다. **서버 구현을 확인하지 않고도 FE 동작이 확정된다.**

## 범위

### 포함

1. `ApiError` + `FailureKind` 정의, `ApiErrorBody`를 `auth.ts`에서 이동
2. 비-2xx 경로 정규화 — `status`·`code`·`validation` 보존
3. 네트워크·타임아웃·파싱 실패를 각 `kind`로 정규화, 원본은 `detail`에 보존
4. 5xx `message`를 FE 고정 문구로 교체
5. `auth.ts`의 로컬 `ApiErrorBody` 제거 후 import (타입만, 동작 무변경)

### 제외

| 항목 | 이유 |
|---|---|
| 각 도메인의 에러 분기 | 409 재조회, `validation` 바인딩, 문구 세분화 — 전부 소비 측 태스크 |
| 고정 문구로 덮는 29곳 / 빈 배열 14곳 | 별도 태스크. 이번엔 동작을 바꾸지 않는다 |
| `code` 기반 문구 매핑 / i18n | 지금은 서버가 문구를 소유한다 |
| 401 재발급 재시도 · `proxy.ts` | **Task 39** 소관 |
| `auth.ts`의 raw fetch 전환 | 401 의미 충돌과 `Set-Cookie` 때문에 우회한 것이라 유지 |

## 리스크: 영향 범위가 앱 전체다

`auth.ts`를 뺀 모든 Server Action(호출 74건, 도메인 8개)과 페이지 12곳이 쓴다.
**동작을 바꾸지 않는 것이 성공 조건**이고, `message` 하위 호환이 유일한 안전장치다.
`ApiError extends Error`에 `message`를 같은 자리에 채우면 호출부는 한 글자도 바뀌지 않는다.

최대 회귀 위험은 [apiClient.ts:55](src/api/apiClient.ts#L55)의 401 → `redirect("/login")`이다.
`redirect()`가 던지는 `NEXT_REDIRECT`를 `ApiError`로 감싸면 전역 리다이렉트가 죽는다.
`isRedirectError` 판정이 정규화보다 **먼저** 실행되어야 한다.

## 완료 기준

- 백엔드가 꺼진 상태에서 `fetch failed`가 아닌 한국어 문구가 뜬다
- 5xx 응답 본문의 문자열이 화면에 노출되지 않는다
- 4xx의 서버 문구는 지금과 동일하게 통과한다
- 401 → `/login` 리다이렉트가 그대로 동작한다
- 호출부 74곳이 무변경이다

## 후속

`kind`·`status`가 생기면 그 위에서 처리한다 — 조회 실패 14곳의 "실패 vs 데이터 없음" 구분,
Flag 409 재조회, 고정 문구 29곳 정리, 폼의 `validation` 바인딩.

## Result

**완료** (2026-08-21) — `agent/task-42-api-failure-normalization`

### Phase 1 — 정적 분석

- `npx tsc --noEmit` 0 에러
- `npm run lint` 총계 **15 problems (3 errors, 12 warnings)** — 작업 전과 **동일**.
  변경 파일의 경고 2건은 모두 사전 존재(`customFetch`의 `catch (e)`, `auth.ts`의 `catch (_e)`)
- 호출부 무변경: `instanceof Error` 20건, `apiClient` 호출 74건 — 작업 전후 동일

### Phase 2 — 회귀 스모크 (실제 백엔드) 10/10

메인 그래프 · Flag 목록 · Buzz · 알림 · 프로필 · 친구요청 정상 렌더, 댓글 작성 정상.

회귀 판정 기준은 Task 41에서 기록해둔 정확한 문자열을 썼다.
종료된 Flag 탈퇴 → **"모집 기간이 종료된 이후에는 참여를 취소할 수 없습니다."**
글자 그대로 동일하게 표시되고 참여자 목록도 유지된다. **문구 하위 호환 확인.**

### Phase 3 — 본체 (스텁 서버) 9/9 + 2/2

`GET`은 실제 스프링으로 넘기고 변경 요청만 시나리오로 응답하는 스텁을 9911에 띄운 뒤,
`NEXT_PUBLIC_API_URL`을 그쪽으로 돌린 dev 서버로 검증했다. 스프링 데이터는 건드리지 않았다.

| 케이스 | 결과 |
|---|---|
| 5xx `{"message":"java.lang.NullPointerException..."}` | 예외 문자열 미노출, `SERVER_ERROR` 표시 |
| 502 + nginx HTML | HTML 미노출, `SERVER_ERROR` 표시 |
| 409 + 한국어 `message` | **서버 문구 그대로 통과** (기존 동작 유지) |
| 400 `{"validation":{...}}` (`message` 없음) | JSON 원문 미노출, `CLIENT_ERROR` 표시 |
| 2xx인데 본문이 HTML (`kind=parse`) | 파서 에러 미노출, `SERVER_ERROR` 표시 |
| 연결 끊김 (`kind=network`) | **`fetch failed` 대신 "네트워크 연결을 확인해 주세요."** |
| **401** | `/login?callbackUrl=%2Fflags` 리다이렉트 정상 — **최대 회귀 위험 해소** |

로그와 화면이 분리된 것도 확인했다.

```
화면:  네트워크 연결을 확인해 주세요.
로그:  [apiClient] POST /api/v1/flags/43/comments → network TypeError: fetch failed
       [apiClient] POST /api/v1/flags/43/comments → http 409 FlagInvalidStatusException
       [apiClient] POST /api/v1/flags/43/comments → parse 200 SyntaxError: Unexpected token '<'
```

`status`·`code`·`kind`가 로그에 남아 원인 분류가 가능해졌다. 기존에는
`Error: 모집 기간이...`와 스택만 남아 4xx인지 5xx인지 알 수 없었다.

### 기록해둘 것

- **Next 16은 프로젝트당 dev 서버 하나만 허용한다.** 실서버와 스텁서버를 동시에 띄우려다
  `Another next dev server is already running`으로 실패했고, 순차 실행으로 처리했다.
  Task 41 검증 중 겪은 `Jest worker` 500도 같은 원인이었음이 확인됐다.
- 네트워크 실패 재현은 스텁을 **죽이는** 대신 `socket.destroy()`로 연결을 끊는 방식이 낫다.
  GET 프록시를 살려둔 채 실패만 주입할 수 있다.
- 검증 중 생성한 데이터는 없다. 변경 요청이 전부 스텁에서 끝나 스프링에 도달하지 않았다
  (flag 43 댓글 0개 확인). Phase 2용 Flag는 삭제했다.
