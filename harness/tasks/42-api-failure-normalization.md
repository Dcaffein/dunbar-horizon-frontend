# Task 42: apiClient 실패 정규화

## 배경

`apiClient`를 통과한 실패가 **호출자에게 세 가지 서로 다른 타입으로 도착한다.**
실측 확인(2026-08-21):

```
BE 4xx/5xx 응답 → Error        | .message = BE가 준 문자열
연결 거부 / DNS  → TypeError    | .message = "fetch failed"
타임아웃         → DOMException | .message = "The operation was aborted due to timeout"
```

호출부 49곳은 이걸 전부 한 줄로 처리한다.

```ts
const message = error instanceof Error ? error.message : "참여에 실패했습니다.";
```

`TypeError`도 `DOMException`도 `Error`를 상속하므로 이 삼항은 **참**이 된다.
결과적으로 **백엔드가 꺼져 있으면 한국어 UI에 `fetch failed`가 그대로 뜬다.**
타임아웃이면 `The operation was aborted due to timeout`이 뜬다.
이는 백엔드 계약과 무관한 프론트 단독 결함이며, 백엔드가 표준을 완벽히 지켜도 남는다.

## 두 번째 문제: 계약 필드가 파싱된 뒤 버려진다

백엔드는 표준적인 형태를 내려주고 있다.

```
401 → {"error":"UnAuthorizedException","message":"인증되지 않은 사용자입니다."}
400 → {"error":"InvalidInputException",
       "message":"입력값이 올바르지 않습니다.",
       "validation":{"nickname":"닉네임은 필수입니다.", ...}}
```

그런데 [apiClient.ts:65-86](src/api/apiClient.ts#L65-L86)이 `message` 하나만 꺼내고
나머지를 버린 뒤 `throw new Error(문자열)`한다.

| 필드 | 현재 |
|---|---|
| `status` | 못 받음. 401만 [apiClient.ts:55](src/api/apiClient.ts#L55)에서 특별 취급 |
| `error` | 파싱해놓고 버림 |
| `validation` | 파싱해놓고 버림 |
| `message` | 유일한 생존자 — 그마저 31곳에서 고정 문구로 덮임 |

`apiClient`가 status를 **모르는 것은 아니다.** 401 판정([apiClient.ts:55](src/api/apiClient.ts#L55))과
`API Error: ${status}` 문자열([apiClient.ts:66](src/api/apiClient.ts#L66))에서 이미 읽는다.
다만 **동작이나 문자열로 소비해버리고 호출자에게 넘기지 않는다.** 그래서 결정을 내려야 하는
Server Action에는 도달하지 않는다.

참고로 `auth.ts`가 raw `fetch`를 쓰는 것은 **status 때문이 아니다.** 이유는 둘이다 —
① 인증 엔드포인트에서 401은 "세션 만료"가 아니라 "자격증명·토큰 무효"라서
전역 `redirect("/login")`이 오히려 틀린 동작을 하고([auth.ts:205](src/app/actions/auth.ts#L205)),
② `fetchInternal`이 body만 반환하고 `response.headers`를 버려 로그인·가입의
`Set-Cookie`를 심을 수 없다([auth.ts:304](src/app/actions/auth.ts#L304)).
`mapSignupError`가 status로 분기하는 것은 우회의 **결과**지 원인이 아니다.
따라서 auth는 "status가 필요해 우회한 선례"가 아니며, 그 두 사정은 다른 도메인에는 없다.

## 이 태스크가 하는 일 / 하지 않는 일

**하는 일은 정규화 하나다.** 성공이 아닌 모든 경로가 **하나의 타입**으로 나오게 한다.

```
HTTP 에러 (계약 있음)  ┐
네트워크 실패          ├→  ApiError  →  kind / status / code / validation / 안전한 message
타임아웃               │
응답 파싱 실패         ┘
```

**분기를 추가하지 않는다.** 각 도메인이 `kind`·`status`로 무엇을 할지는 그 도메인 태스크에서 정한다.
이 태스크는 그 선택지를 **가능하게만** 만든다. 지금은 선택지 자체가 없다.

## 설계

### 판별자를 명시한다

필드를 전부 optional로 두면 "`status`가 없다"가 암묵적으로 네트워크 실패를 뜻하게 된다.
그 암묵 규칙이 다음 세대의 문자열 파싱이 된다. 그래서 `kind`를 명시한다.

```ts
type FailureKind = "http" | "network" | "timeout" | "parse";

export interface ApiErrorBody {   // auth.ts:121에서 이동 — 신규 정의 아님
  error?: string;
  message?: string;
  validation?: Record<string, string>;
}

export class ApiError extends Error {
  readonly kind: FailureKind;
  readonly status?: number;                      // kind === "http" 일 때만
  readonly code?: string;                        // BE 예외 식별자 — 렌더링 금지
  readonly validation?: Record<string, string>;
  readonly cause?: unknown;                      // 원본 보존 (로깅용)
}
```

### message는 항상 "화면에 띄워도 되는 문장"

| 실제 실패 | `kind` | `message` |
|---|---|---|
| 4xx 응답 | `http` | BE `message` (표시용 한국어) |
| 5xx 응답 | `http` | **FE 고정 문구** — body 불신 |
| 연결 거부 / DNS | `network` | FE 고정 문구 |
| 타임아웃 | `timeout` | FE 고정 문구 |
| 응답 파싱 실패 | `parse` | FE 고정 문구 |

5xx를 불신하는 이유: 지금 확인된 응답은 전부 서버가 **의도적으로 처리한** 예외다.
처리되지 않은 5xx에서도 `message`가 안전한지는 프론트가 보장할 수 없다.
서버가 이미 안전한 문구를 주더라도 손해가 없고(한 겹 일반화될 뿐),
아니라면 예외 문자열 노출을 막는다. 서버 구현을 확인하지 않고도 FE 동작이 확정된다.

### 분기는 status로, code는 로그로

동작 분기의 1차 판단은 **항상 `status`**다. RFC 9457이 나눈 대로 status가 문제의 부류를
담고 있고, FE가 행동을 가르는 축(입력 오류 / 인증 / 권한 / 없음 / 상태 충돌 / 서버 장애)이
대부분 거기서 나온다.

`code`(=BE `error`)는 **로그·진단 전용이다. 렌더링하지 않고, 분기에도 쓰지 않는다.**
현재 값이 `FlagDeadlinePassedException` 같은 **자바 클래스 이름**이기 때문이다.
설계된 계약 식별자가 아니라 구현 세부가 새어 나온 것이라, 백엔드가 클래스를 rename하면
프론트 분기가 조용히 깨진다. 프론트가 백엔드 내부 구조에 결합되면 안 된다.

진단에는 실제로 값을 한다. Task 41 검증에서 신·구 경로가 **둘 다 404**였을 때
`FlagParticipantNotFoundException`(리소스 없음)과 `NotFoundException: 요청하신 경로를
찾을 수 없습니다`(경로 없음)를 갈라준 것이 이 필드다. 사용자 분기가 아닌 개발자 진단이었다.

`code` 기반 분기가 정말 필요해지는 시점(같은 status에서 UI 행동이 갈릴 때)이 오면,
클래스명에 의존하지 말고 **백엔드에 안정적인 code 계약을 요청**한다.

`UnAuthorizedException` 류 문자열이 사용자에게 보이면 안 된다. 현재 렌더링하는 코드는 0건이며 그대로 유지한다.

### 하위 호환이 이 설계의 전제

`ApiError extends Error`이고 `message`는 지금과 **같은 자리에 같은 방식**으로 채운다.
따라서 호출부는 한 글자도 바뀌지 않고 그대로 동작한다.

**안 고친 곳도 좋아진다** — `message` 통과 20곳에서 `fetch failed`가 뜨던 게 사라진다.
고정 문구로 덮는 29곳은 지금과 동일하게 동작한다(개선은 각 도메인 태스크에서).

## 작업 범위

### 포함

1. `ApiError` + `FailureKind` 정의, `ApiErrorBody`를 `auth.ts`에서 이동
2. `fetchInternal`의 비-2xx 경로를 `ApiError("http", ...)`로 정규화 — `status`·`code`·`validation` 보존
3. `catch` 경로에서 네트워크/타임아웃/파싱 실패를 각 `kind`로 정규화, `cause`에 원본 보존
4. 5xx `message`를 FE 고정 문구로 교체
5. `auth.ts`의 로컬 `ApiErrorBody` 정의 제거 후 import (동작 무변경)

### 제외

- **각 도메인의 에러 분기** — 409 재조회, `validation` 필드 바인딩, 문구 세분화. 전부 소비 측 태스크 소관
- **고정 문구로 덮는 29곳 정리** — 별도 태스크. 이번엔 동작을 바꾸지 않는다
- **조회 실패 시 빈 배열 반환 14곳** — 화면에서 "실패"와 "데이터 없음"이 구분되지 않는 문제. 별도 태스크
- **`code` 기반 문구 매핑 / i18n** — 지금은 서버가 문구를 소유한다. 필요해질 때 도입
- **401 재발급 재시도** — Task 39 소관. `redirect("/login")` 분기는 손대지 않는다
- **`auth.ts`의 raw fetch 전환** — 401 전역 리다이렉트와 `Set-Cookie` 때문에 우회한 것이라 유지

## 리스크: 영향 범위가 앱 전체다

`apiClient`는 `auth.ts`를 제외한 모든 Server Action과 페이지 12곳이 쓴다. 호출 74건, 도메인 8개.
**동작을 바꾸지 않는 것이 이 태스크의 성공 조건이다** — `message` 하위 호환이 유일한 안전장치다.

특히 주의할 회귀 지점 둘:

| 지점 | 위험 |
|---|---|
| [apiClient.ts:55](src/api/apiClient.ts#L55) 401 → `redirect("/login")` | `redirect()`가 던지는 `NEXT_REDIRECT`를 `ApiError`로 감싸면 **전역 리다이렉트가 죽는다** |
| [apiClient.ts:104](src/api/apiClient.ts#L104) `isRedirectError` | 위 판정이 정규화보다 **먼저** 실행되어야 한다 |

`redirect()`는 `!response.ok` 블록보다 위에 있고, `catch`에서도 `isRedirectError`가 최우선으로
재던지므로 순서상 간섭이 없다. 다만 **Phase 3에서 반드시 실측 검증**한다.

## 변경 파일

| 파일 | 변경 |
|---|---|
| `src/api/apiClient.ts` | `ApiError`·`FailureKind`·`ApiErrorBody` 정의, `fetchInternal` 정규화 |
| `src/app/actions/auth.ts` | 로컬 `ApiErrorBody` 제거 후 import (타입만, 동작 무변경) |

Mock 파일은 생성하지 않는다. 신규 UI가 없고 전송 계층 단독 변경이다.

## 검증

### Phase 1 — 정적 분석

- `npx tsc --noEmit` 에러 없음
- `npm run lint` 에러 없음
- `grep -rn "instanceof Error" src/app/actions | wc -l` 결과가 작업 전후 동일 (호출부 무변경 확인)

### Phase 2 — UI / State (회귀 스모크)

기준 계정: 이수환 / leesuhwan@test.com / String123! (user_id=4)

**동작이 바뀌지 않았음을 확인하는 게 목적이다.** 도메인별 대표 실패 1개씩.

| 도메인 | 확인 |
|---|---|
| 그래프 / 친구 | 메인 진입, 노드 조회 정상 |
| Label | 생성 실패 시 기존과 동일한 문구 |
| Buzz | 작성·댓글 정상, 실패 문구 동일 |
| Flag | 상세·댓글·메모리얼 정상 (Task 41 완료 후) |
| Profile | 내 프로필 / 공개 프로필 양쪽 |
| Notification | 목록 조회 정상 |

스크린샷 → `harness/verify/verify-42-*.png`

### Phase 3 — Edge Case (이 태스크의 본체)

- **백엔드 중지 후 액션 수행** → **`fetch failed`가 아닌 한국어 고정 문구**. `kind === "network"`
- **타임아웃** → `The operation was aborted...`가 아닌 고정 문구
- **5xx** → BE가 준 문자열이 아닌 FE 고정 문구
- **4xx** → BE `message`가 그대로 통과 (기존 동작 유지)
- **401** → `redirect("/login")` **정상 동작**. 이 태스크의 최대 회귀 위험
- **비-JSON 응답**(HTML 502 등) → `kind === "parse"`, 고정 문구
- **`code` 노출 여부** → 어떤 화면에도 `UnAuthorizedException` 류 문자열이 뜨지 않음

## 선행 조건

없다. Task 41(Flag URL 리팩토링)은 완료되어 main에 병합됐고, 거기서 확인된
Flag 실패 문구를 Phase 2의 회귀 판정 기준으로 쓴다.

## 후속

이 태스크가 끝나면 각 도메인이 필요한 만큼 얹는다.

- Flag 409 → 재조회 후 안내 (`status === 409`는 "내 화면이 낡았다"는 뜻)
- 폼 화면 → `validation`을 필드 아래 바인딩
- 고정 문구 31곳 / 빈 배열 14곳 정리

## Result

_미착수_
