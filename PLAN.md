# PLAN: Task 18 — Flag Memorial

> 참조 태스크: `harness/tasks/18-flag-memorial.md`

## 요구사항 분석

Flag 상세 페이지 하단에 Memorial 섹션 추가.
참가자(host 포함)가 기억을 남기고, 본인 Memorial만 수정·삭제 가능.

## 소유권 판단

`MemorialResult`에 `isMyMemorial` 없음 → `memorial.writerId === myUserId` 클라이언트 비교.
`myUserId`는 `FlagDetail`이 이미 props로 받고 있으므로 추가 API 호출 불필요.

## 작업 범위

### 수정 파일

1. **`src/app/actions/flag.ts`**
   - `getMemorialsAction(flagId)` → `GET /api/v1/flags/{flagId}/memorials`
   - `createMemorialAction(flagId, content)` → `POST /api/v1/flags/{flagId}/memorials`
   - `updateMemorialAction(id, content)` → `PATCH /api/v1/flags/memorials/{id}`
   - `deleteMemorialAction(id)` → `DELETE /api/v1/flags/memorials/{id}`

2. **`src/app/flags/[id]/page.tsx`**
   - `getMemorialsAction(id)` 추가 호출
   - `memorials: MemorialResult[]` FlagDetail에 전달

3. **`src/components/Flag/FlagDetail.tsx`**
   - `memorials` prop 추가
   - 하단에 Memorial 섹션 렌더링 (FlagMemorial 컴포넌트 사용)

### 신규 파일

4. **`src/components/Flag/FlagMemorial.tsx`** (Client Component)
   - props: `flagId`, `initialMemorials`, `myUserId`, `isParticipant`
   - 상태: `memorials`, `text`(입력), `editingId`+`editText`
   - 작성 버튼: `isParticipant`(host 포함)일 때만 표시
   - 수정·삭제 버튼: `memorial.writerId === myUserId`일 때만 표시
   - 작성·수정·삭제 성공 → `router.refresh()`

## isParticipant 판단

`FlagDetail`이 이미 `isHost`, `isParticipating`을 계산하고 있음.
`isParticipant = isHost || isParticipating`으로 전달.

## 테스트 시나리오

### Phase 1 — 정적 분석
- `npx tsc --noEmit` 에러 없음
- `npm run lint` 에러 없음

### Phase 2 — UI/State 검증
- Flag 상세 하단 Memorial 섹션 표시
- 참가자로 로그인 → 입력창 + [남기기] 버튼 표시
- Memorial 작성 → 목록 반영
- 내 Memorial [수정][삭제] 버튼 표시 → 동작 확인
- 타인 Memorial 수정·삭제 버튼 미표시

### Phase 3 — Edge Case
- 비참가자(참여 안 한 유저) → 입력창 미표시
- 빈 내용 제출 → 버튼 비활성화
- Memorial 없을 때 빈 상태 메시지 표시
