# PLAN: Task 05 — 회원가입 비밀번호 유효성 검증 강화

> 참조 태스크: `harness/tasks/05-auth-password-validation.md`
> 작업 브랜치: `agent/task-05-auth-password-validation`

---

## 1. 배경

백엔드 `SignupRequestDto`의 password 패턴: **영문·숫자·특수문자(`!@#$%^&*`) 모두 포함, 8~20자**
현재 Zod 스키마는 `min(4)`만 검증 → 조건 미충족 입력이 백엔드까지 전달돼 400 에러 발생

---

## 2. 수정 파일

| 파일 | 변경 내용 |
|---|---|
| `src/app/actions/auth.ts` | `signupSchema` password 검증 강화, catch 블록 안전화 |
| `src/app/(auth)/signup/page.tsx` | 비밀번호 필드 placeholder + 힌트 문구 업데이트 |

---

## 3. 변경 상세

### `signupSchema` password 필드

```ts
// Before
password: z.string().min(4, "비밀번호는 4자 이상이어야 합니다.")

// After
password: z
  .string()
  .min(8, "비밀번호는 8자 이상이어야 합니다.")
  .max(20, "비밀번호는 20자 이하여야 합니다.")
  .regex(
    /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]+$/,
    "영문, 숫자, 특수문자(!@#$%^&*)를 모두 포함해야 합니다."
  )
```

### `signupAction` catch 블록

```ts
// Before
const errorMessage =
  error instanceof Error
    ? error.message        // ← 백엔드 내부 메시지 노출 위험
    : "회원가입 중 오류가 발생했습니다.";

// After
return { message: "회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." };
```

### `signup/page.tsx` 비밀번호 필드

```tsx
// Before
placeholder="4자 이상"

// After
placeholder="영문·숫자·특수문자 포함 8~20자"
// 필드 아래 힌트 추가
<p className="text-xs text-gray-400 mt-1 pl-1">
  영문, 숫자, 특수문자(!@#$%^&*)를 모두 포함해야 합니다.
</p>
```

---

## 4. 테스트 시나리오

### Phase 1 — 정적 분석
- `npx tsc --noEmit` — 에러 없음
- `npm run lint` — 신규 에러 없음

### Phase 2 — UI/상태 검증 (Playwright)
1. `Abcd12!` (7자) → 폼 차단, "8자 이상" 에러 표시
2. `abcd1234` (특수문자 없음) → 폼 차단, regex 에러 표시
3. `Abcd!@#$` (숫자 없음) → 폼 차단, regex 에러 표시
4. `12345!@#` (영문 없음) → 폼 차단, regex 에러 표시
5. `String123!` (조건 충족) → 폼 통과 (백엔드 호출까지)
6. placeholder가 "영문·숫자·특수문자 포함 8~20자"로 표시
