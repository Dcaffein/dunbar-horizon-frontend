# Task 05: 회원가입 비밀번호 유효성 검증 강화

## 배경

백엔드 `SignupRequestDto`의 password 필드에 패턴 제약이 존재한다:
영문·숫자·특수문자(`!@#$%^&*`) 모두 포함, 길이 8~20자.

현재 Zod 스키마는 `min(4)`만 검증하므로 조건 미충족 입력이 백엔드까지 전달돼 400 에러가 발생한다.
또한 `signupAction`의 catch 블록이 `error.message`를 그대로 반환하는데, 백엔드 내부 구현이 담긴 메시지가 사용자에게 노출될 수 있다.

## 수정 범위

- `src/app/actions/auth.ts`
  - `signupSchema`의 password 검증을 백엔드 패턴에 맞춰 강화 (`min(8)`, `max(20)`, regex)
  - `signupAction` catch 블록을 고정 한국어 안내 문구로 교체 (원시 에러 노출 차단)
- `src/app/(auth)/signup/page.tsx` — 비밀번호 입력 필드 placeholder/힌트 업데이트 ("영문·숫자·특수문자 포함 8~20자")

## 검증

- 4~7자 비밀번호 입력 시 폼 차단
- 영문/숫자/특수문자 중 하나 누락 시 차단
- 조건 충족 비밀번호 정상 제출
- 에러 메시지가 한국어 안내 문구로 표시

## Result

### 작업 브랜치
`agent/task-05-auth-password-validation` → `feature/api-harness-setup` 머지 완료

### 수정 파일
- `src/app/actions/auth.ts`
  - `signupSchema` password: `min(4)` → `min(8)` + `max(20)` + regex(`/^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]+$/`)
  - `signupAction` catch: `error.message` 직접 반환 → 고정 문구 `"회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."`
- `src/app/(auth)/signup/page.tsx`
  - 비밀번호 placeholder: `"4자 이상"` → `"영문·숫자·특수문자 포함 8~20자"`
  - 필드 아래 조건 힌트 텍스트 추가

### 검증 결과
- **Phase 1**: `npx tsc --noEmit` 에러 없음, `npm run lint` 에러 없음
- **Phase 2**: Playwright E2E 검증 6/6 통과
  1. placeholder "영문·숫자·특수문자 포함 8~20자" 표시 ✅
  2. 힌트 텍스트 노출 ✅
  3. 7자(`Abcd12!`) → "비밀번호는 8자 이상이어야 합니다." 차단 ✅
  4. 특수문자 없음(`Abcd1234`) → regex 에러 차단 ✅
  5. 숫자/영문 없음 → regex 에러 차단 ✅
  6. 조건 충족(`String123!`) → Zod 에러 없이 통과, 회원가입 성공 ✅
- **Phase 3**: 해당 없음 (프론트 Zod 검증 강화 태스크, 별도 API 연동 불필요)
