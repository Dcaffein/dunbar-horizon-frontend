# PLAN: Task 14 — Flag 세부 수정

> 참조 태스크: `harness/tasks/14-flag-edit.md`

## 요구사항 분석

Flag Host가 생성된 Flag의 제목·설명·인원·일정을 수정할 수 있는 편집 페이지를 구현한다.

- `/flags/{id}/edit` 신규 페이지 (서버 컴포넌트가 현재 값 조회 → 클라이언트 폼에 초기값 전달)
- 저장 시 **변경된 항목에 따라** API 선택적 호출 (변경 없으면 호출 안 함)
- 비Host 접근 시 `/flags/{id}` 리다이렉트

## 사용 API

| 변경 항목 | API |
|---|---|
| 제목 or 설명 변경 | `PATCH /api/v1/flags/{id}/details` |
| 인원 변경 | `PATCH /api/v1/flags/{id}/capacity` |
| 일정(셋 중 하나라도) 변경 | `PUT /api/v1/flags/{id}/schedule` (전체 필드 전송) |

## 작업 범위 (수정/생성 파일)

### 수정 파일

1. **`src/app/actions/flag.ts`**
   - `updateFlagDetailsAction(id, body)` 추가 — `PATCH /details`
   - `updateFlagCapacityAction(id, body)` 추가 — `PATCH /capacity`
   - `updateFlagScheduleAction(id, body)` 추가 — `PUT /schedule`

2. **`src/components/Flag/FlagForm.tsx`**
   - `flagId?: number` + `initialValues?` props 추가
   - `flagId` 존재 시 edit 모드: 초기값으로 state 초기화, submit 시 diff 감지 후 선택적 API 호출
   - 헤더 타이틀 "Flag 만들기" → "Flag 수정" (edit 모드)
   - 버튼 레이블 "Flag 만들기" → "저장" (edit 모드), "생성 중..." → "저장 중..." (edit 모드)

3. **`src/components/Flag/FlagDetail.tsx`**
   - 헤더 우측 `isHost && <Link href={/flags/${flag.id}/edit}>수정</Link>` 추가

### 신규 파일

4. **`src/app/flags/[id]/edit/page.tsx`** (서버 컴포넌트)
   - `getFlagDetailAction(id)` 로 현재 값 조회
   - `apiClient.get("/api/v1/accounts/me")` 로 내 userId 조회
   - `flag.host?.id !== myUserId` 이면 `redirect(\`/flags/${id}\`)`
   - `FlagForm`에 `flagId` + `initialValues` 전달

## initialValues 인터페이스

```ts
interface FlagFormInitialValues {
  title: string;
  description: string;
  startDateTime: string;   // datetime-local 포맷 "YYYY-MM-DDTHH:mm"
  endDateTime: string;
  deadline: string;        // 없으면 ""
  capacity: string;        // 없으면 ""
}
```

## 변경 감지 로직 (edit 모드 submit)

```
detailsChanged  = title !== initial.title || description !== initial.description
capacityChanged = capacity !== initial.capacity
scheduleChanged = startDateTime !== initial.startDateTime
               || endDateTime !== initial.endDateTime
               || deadline !== initial.deadline

→ detailsChanged  → updateFlagDetailsAction
→ capacityChanged → updateFlagCapacityAction
→ scheduleChanged → updateFlagScheduleAction (startDateTime + endDateTime + deadline? 전송)
→ 모두 false      → API 호출 없이 router.push(`/flags/${flagId}`)
```

## 테스트 시나리오 (harness/TESTING_RULES.md 3단계)

### Phase 1 — 정적 분석
- `npx tsc --noEmit` 에러 없음
- `npm run lint` 에러 없음

### Phase 2 — UI/State 검증
- Flag 상세(Host 로그인) → 헤더에 [수정] 버튼 표시
- `/flags/{id}/edit` 진입 → 현재 값이 폼 필드에 채워짐
- 제목 수정 후 저장 → `PATCH /details` 200 → `/flags/{id}` 이동, 변경 반영
- 인원 수정 후 저장 → `PATCH /capacity` 200 → 반영
- 일정(시작·종료·마감 중 하나) 수정 후 저장 → `PUT /schedule` 200 → 반영

### Phase 3 — Edge Case
- 아무것도 바꾸지 않고 저장 → API 호출 없이 `/flags/{id}` 이동
- 비Host 로그인 상태로 `/flags/{id}/edit` 직접 접근 → `/flags/{id}` 리다이렉트
- 잘못된 id(NaN) → `/flags` 리다이렉트
- 시작 일시 ≥ 종료 일시 → 클라이언트 validation 에러 표시
- 여러 항목 동시 수정 → 해당 API 모두 호출, 전부 성공 후 이동
