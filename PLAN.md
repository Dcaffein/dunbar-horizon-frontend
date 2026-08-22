# PLAN: Task 45 — validation 응답을 폼 필드에 바인딩

배경은 `harness/tasks/45-validation-field-binding.md` 참고.

## 1. 착수 전 조사 결과

문서에 "키가 폼 필드명과 일치하는지 먼저 확인"이라고 적어둔 항목을 실측했다.
Task 43에서 404 문제를 찾은 것과 같은 방식으로 400 응답을 전수 수집했다.

### 좋은 소식 — 키가 그대로 맞는다

```
Flag 생성   {"title":"...", "description":"...", "startDateTime":"...", "endDateTime":"..."}
Flag 인원   {"capacity":"..."}
댓글·메모리얼 {"content":"..."}
Buzz        {"recipient":"...", "text":"..."}
Label       {"labelName":"..."}
프로필      {"nickname":"..."}
```

`FlagForm`의 `errors.title` · `errors.startDateTime` · `errors.capacity` 와 **키가 동일하다.**
매핑 테이블이 필요 없다.

### 나쁜 소식 — 문구의 절반이 영어다

| 엔드포인트 | 문구 |
|---|---|
| Flag 생성 | `must not be blank` / `must not be null` |
| Flag 인원 | `must be greater than or equal to 1` |
| 댓글 501자 | `size must be between 0 and 500` |
| Buzz | **수신자 정보는 필수입니다.** |
| Label | **라벨 이름은 필수입니다.** |
| 프로필 | **닉네임은 1자 이상 20자 이하로 입력해주세요.** |

일부 DTO만 `message` 속성을 지정했고 나머지는 Bean Validation 기본 메시지가 그대로 온다.
**그대로 꽂으면 한국어 UI에 `must not be blank` 가 뜬다.**

Task 43의 404와 같은 종류의 발견이다 — 노출 범위를 넓히기 전에 무엇이 노출되는지 재봤더니
그대로 쓸 수 없는 것이 섞여 있었다.

### 부수적으로 발견한 백엔드 이슈 2건 (이 태스크 범위 밖, 보고 대상)

- **Flag 제목 300자 → 500** (`서버 내부 오류`). 길이 제한이 Bean Validation 이 아니라
  DB 컬럼에만 걸려 있는 것으로 보인다. 400 + `validation` 이어야 한다
- **프로필 닉네임 21자 → `InvalidJsonFormatException`**. 길이 초과인데 JSON 형식 오류로 응답한다

## 2. 설계

### 영문 기본 메시지는 프론트가 한국어로 대체한다

문구에 **한글이 하나도 없으면** Bean Validation 기본 메시지로 간주하고 FE 문구로 바꾼다.

```ts
const hasKorean = /[가-힣]/.test(msg);
return hasKorean ? msg : FIELD_FALLBACK;   // "올바른 값을 입력해 주세요."
```

휴리스틱이라는 점은 분명히 해둔다. 다만

- 오판의 방향이 안전하다 — 한국어 문구를 영문으로 오인할 일이 없고,
  영문을 놓쳐도 지금과 같은 상태일 뿐이다
- 백엔드가 `message` 속성을 채우면 **이 분기는 자연히 안 쓰이게 된다.** 코드를 되돌릴 필요가 없다
- 문자열 내용으로 **분기**하는 것이 아니라 **표시 여부**만 정한다. Task 42가 금지한
  "메시지로 동작을 가르는 것"과는 다르다

구체적인 문구를 잃는 대신 언어 일관성을 얻는 교환이다. 백엔드 정비 요청과 병행한다.

### 액션은 실어 보내기만 한다

Task 44의 `failure` 와 같은 방식. 반환 타입에 추가만 하므로 기존 소비자가 깨지지 않는다.

```ts
catch (error) {
  if (isRedirectError(error)) throw error;
  const message = error instanceof Error ? error.message : "Flag 생성에 실패했습니다.";
  return { success: false as const, message, validation: toFieldErrors(error) };
}
```

`toFieldErrors(error)` 는 `ApiError.validation` 을 위 규칙으로 정제해 `Record<string,string>`
또는 `undefined` 를 돌려준다. `apiClient` 옆에 둔다.

### 폼은 기존 슬롯에 병합한다

`FlagForm` 은 이미 `errors: Record<string, string>` 과 필드별 `<p>` 를 갖고 있다.
서버 결과를 그 위에 얹으면 끝이다.

```ts
if (!result.success) {
  setErrors((prev) => ({ ...prev, ...(result.validation ?? {}), submit: result.validation ? "" : result.message }));
}
```

필드 에러가 있으면 하단의 뭉뚱그린 문구(`errors.submit`)는 비운다. 같은 내용을 두 번 보여줄 이유가 없다.

## 3. 대상

| 폼 | 슬롯 | 할 일 |
|---|---|---|
| `Flag/FlagForm.tsx` | 있음 (title·description·startDateTime·endDateTime·capacity) | 병합만 |
| `Buzz/BuzzForm.tsx` | 있음 | 병합. 키는 `recipient`·`text` |
| `MyProfile/MyProfile.tsx` | **없음** | `nickname` 슬롯 추가 |
| `Label` 생성·수정 | **없음** | `labelName` 슬롯 추가 |
| 댓글·메모리얼 | 입력이 한 칸뿐 | **제외** — 기존 단일 문구로 충분하고, Task 41의 `maxLength` 가드가 이미 예방한다 |
| 회원가입 | 이미 완료 | 손대지 않는다 (선례) |

## 4. Phase

1. **장치** — `toFieldErrors()` + 액션 반환 타입에 `validation` 추가 (소비하지 않음)
2. **슬롯 있는 폼** — `FlagForm`, `BuzzForm` 병합
3. **슬롯 없는 폼** — `MyProfile`, `Label` 에 필드 에러 표시 추가

Phase 1은 화면 동작이 바뀌지 않는다. Task 44와 같은 구조다.

## 5. 검증

### Phase 1

- `npx tsc --noEmit`, `npm run lint` (총계 15 problems 유지)
- 전 도메인 스모크에서 **화면이 지금과 동일**할 것

### Phase 2·3 — 실제 백엔드로 폼마다 틀린 값 입력

| 폼 | 입력 | 기대 |
|---|---|---|
| Flag 생성 | 제목·설명 비움 | 두 칸 **각각** 아래에 안내. 영문(`must not be blank`)이 아닌 한국어 |
| Flag 생성 | 인원 `-5` | 인원 칸 아래에 안내 |
| Buzz | 본문 비움 | 본문 칸 아래에 **"본문 내용은 필수입니다."** (백엔드 한국어 그대로) |
| Label | 이름 비움 | **"라벨 이름은 필수입니다."** |
| 프로필 | 닉네임 비움 | **"닉네임은 1자 이상 20자 이하로 입력해주세요."** |

**대조 항목**: 백엔드가 한국어를 준 경우(Buzz·Label·프로필)는 **그 문구가 그대로** 나와야 한다.
FE 대체 문구로 덮이면 버그다.

### 회귀

- 클라이언트 검증(제출 전)은 지금과 동일하게 동작할 것
- 서버 검증 실패 시 **입력값이 보존**될 것 (폼이 비워지면 안 된다)

Phase별 커밋. **push는 하지 않는다.**

## 6. 리스크

| 리스크 | 대응 |
|---|---|
| 한글 판정 휴리스틱의 오판 | 방향이 안전(한국어→영문 오인 불가). 백엔드 정비 시 자연 소멸 |
| 서버 검증 실패 후 입력값 소실 | 회귀 항목으로 명시 검증 |
| 필드 에러와 하단 문구 중복 표시 | 필드 에러가 있으면 `errors.submit` 을 비운다 |
| 백엔드가 새 필드를 추가하면 슬롯이 없어 안 보임 | 매칭 안 되는 키는 하단 문구로 모아 표시(누락 방지) |

## 7. 브랜치

`agent/task-45-validation-field-binding` (main에서 분기, Task 44 병합 완료 상태).
