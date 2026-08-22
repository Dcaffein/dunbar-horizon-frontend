# Task 45: validation 응답을 폼 필드에 바인딩

> 미착수. Task 42(실패 정규화) 완료가 전제다.

## 문제

백엔드는 400에서 **필드별 안내**를 내려준다.

```json
{
  "error": "InvalidInputException",
  "message": "입력값이 올바르지 않습니다.",
  "validation": { "nickname": "닉네임은 필수입니다.", "password": "비밀번호는 영문, 숫자, 특수문자를 포함하여 8~20자로 입력해주세요." }
}
```

그런데 대부분의 폼이 뭉뚱그린 `message` 하나만 띄운다.
사용자는 **어느 입력이 틀렸는지 모른 채** 폼 전체를 다시 살펴야 한다.

회원가입만 예외다 — [auth.ts:131](src/app/actions/auth.ts#L131) `mapSignupError`가
`validation`을 읽어 필드별 에러로 변환한다. 그 패턴을 다른 폼으로 넓히는 작업이다.

## 대상 후보

- 프로필 수정 (닉네임)
- Label 생성·수정
- Flag 생성·수정 (제목·설명·인원·일정)
- Buzz 작성

## 방향

`ApiError.validation`을 액션의 반환 타입에 실어 폼 컴포넌트가 필드 아래에 표시한다.
`auth.ts`의 `AuthFormState.errors` 구조가 이미 있으므로 그 형태를 재사용한다.

### 착수 전 조사 결과 (2026-08-21 실측)

**키는 폼 필드명과 그대로 일치한다.** 매핑 테이블이 필요 없다 —
`title`·`description`·`startDateTime`·`endDateTime`·`capacity`·`content`·
`recipient`·`text`·`labelName`·`nickname`.

**다만 문구의 절반이 영문 기본 메시지다.**

| | 문구 |
|---|---|
| Flag·댓글 | `must not be blank` / `size must be between 0 and 500` |
| Buzz·Label·프로필 | **한국어** ("라벨 이름은 필수입니다." 등) |

그대로 꽂으면 한국어 UI 에 영문이 뜬다. 왜 엔드포인트마다 다른지는 백엔드 사정이다.
프론트에 필요한 사실은 **일부 문구를 사용자에게 그대로 쓸 수 없다**는 것뿐이다.
대응은 `PLAN.md` 참고.

### 백엔드에 보고할 것 (이 태스크 범위 밖)

전 도메인 400 응답을 훑은 결과다(2026-08-21, 실측).

#### ① `validation` 문구가 영문인 엔드포인트 — 10건

사용자에게 그대로 보여줄 수 없다. 프론트가 일반 문구로 대체하지만,
한국어로 오면 그 대체가 불필요해지고 안내도 구체적이 된다.

| 도메인 | 요청 | 응답 `validation` |
|---|---|---|
| Flag 생성 | 필수값 누락 | `{"title":"must not be blank", "description":"must not be blank", "startDateTime":"must not be null", "endDateTime":"must not be null"}` |
| Flag 생성 | `capacity: -5` | `{"capacity":"must be greater than or equal to 1"}` |
| Flag 수정 `/details` | 빈값 | `{"title":"must not be blank", "description":"must not be blank"}` |
| Flag 수정 `/capacity` | `-1` | `{"capacity":"must be greater than or equal to 1"}` |
| 댓글 생성 | 빈값 | `{"content":"must not be blank"}` |
| 댓글 생성 | 501자 | `{"content":"size must be between 0 and 500"}` |
| 메모리얼 생성 | 빈값 | `{"content":"must not be blank"}` |
| 메모리얼 생성 | 1001자 | `{"content":"size must be between 0 and 1000"}` |
| 초대 생성 | `flagId` 누락 | `{"flagId":"must not be null"}` |
| 초대 생성 | `inviteeId` 누락 | `{"inviteeId":"must not be null"}` |

**대비군 — 한국어로 잘 오는 곳** (이 형태가 목표다)

```
Buzz    {"recipient":"수신자 정보는 필수입니다.", "text":"본문 내용은 필수입니다."}
Label   {"labelName":"라벨 이름은 필수입니다."} / {"labelName":"라벨 이름은 20자 이내여야 합니다."}
프로필   {"nickname":"닉네임은 1자 이상 20자 이하로 입력해주세요."}
```

#### ② 400 + `validation` 이 아니라 500 이 오는 엔드포인트 — 2건

**Flag 제목이 256자 이상일 때.** 생성·수정 양쪽에서 재현된다.

| 요청 | 응답 |
|---|---|
| `POST /api/v1/flags` · 제목 256자 | `500 {"error":"InternalServerException","message":"서버 내부 오류가 발생했습니다..."}` |
| `PATCH /api/v1/flags/{id}/details` · 제목 256자 | 동일 |

경계를 이분해 확인했다. 바이트가 아니라 **글자 수 255/256** 이다.

```
한글 255자(765byte) → 201     ASCII 255자 → 201
한글 256자(768byte) → 500     ASCII 256자 → 500
```

**프론트는 이 실패를 필드에 표시할 수 없다.** 5xx 는 Task 42 규칙에 따라
"일시적인 오류가 발생했습니다"로 덮이므로, 사용자는 제목이 길어서 실패한 것을 모른다.
400 + `validation` 으로 오면 제목 칸 아래에 바로 표시된다.

참고로 **설명(description)은 256자에서 정상 생성**된다. 제목만 걸린다.

#### 참고 — 정상 동작으로 확인된 것

- Flag 종료<시작 → `409 FlagScheduleInvalidException "종료는 시작보다 늦어야 합니다."` (한국어, 적절)
- 댓글 500자 / 메모리얼 255·256자 → 정상 생성

#### 측정하지 못한 것

- Buzz 본문 길이 제한 — `recipient` 형식 오류가 먼저 걸려 확인하지 못했다
- Flag 제목의 실제 상한 — 255 초과는 전부 500 이라 상한 자체가 있는지 알 수 없다

## 방향

`ApiError.validation`을 액션의 반환 타입에 실어 폼 컴포넌트가 필드 아래에 표시한다.
`auth.ts`의 `AuthFormState.errors` 구조가 이미 있으므로 그 형태를 재사용한다.

### 착수 전 조사 결과 (2026-08-21 실측)

**키는 폼 필드명과 그대로 일치한다.** 매핑 테이블이 필요 없다 —
`title`·`description`·`startDateTime`·`endDateTime`·`capacity`·`content`·
`recipient`·`text`·`labelName`·`nickname`.

**다만 문구의 절반이 영문 기본 메시지다.**

| | 문구 |
|---|---|
| Flag·댓글 | `must not be blank` / `size must be between 0 and 500` |
| Buzz·Label·프로필 | **한국어** ("라벨 이름은 필수입니다." 등) |

그대로 꽂으면 한국어 UI 에 영문이 뜬다. 왜 엔드포인트마다 다른지는 백엔드 사정이다.
프론트에 필요한 사실은 **일부 문구를 사용자에게 그대로 쓸 수 없다**는 것뿐이다.
대응은 `PLAN.md` 참고.

### 백엔드에 보고할 것 (이 태스크 범위 밖)

- **`validation` 문구가 영문인 엔드포인트들** (Flag 생성·수정, 댓글, 메모리얼).
  Buzz·Label·프로필처럼 한국어로 오면 프론트의 대체 문구가 불필요해진다
- **Flag 제목 256자부터 500** (`InternalServerException`). 이분 확인 결과 바이트가 아니라
  글자 수 255 경계다. 400 + `validation` 으로 와야 제목 칸에 표시할 수 있다

## 참고

Task 41에서 댓글 500자 제한에 `maxLength` 클라이언트 가드를 넣었다.
같은 방식으로 **애초에 400이 나지 않게 예방**하는 것과 병행한다.
서버 검증을 대체하는 것이 아니라 왕복을 줄이는 목적이다.

## Result

_미착수_
