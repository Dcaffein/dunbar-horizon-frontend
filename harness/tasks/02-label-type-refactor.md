# Task 02: Label 타입 구조 변경 (memberIds → members 객체 배열)

## 배경

백엔드 `LabelResult` 응답에서 멤버 구조가 변경됐다.
`memberIds: number[]` 에서 `members: { id: number, nickname: string }[]` 로 바뀌어,
멤버 추가 직후 닉네임을 즉시 UI에 표시할 수 있게 됐다.

`id` 타입은 Orval 생성 타입 확인 결과 `string`으로 확정됐다.

## 수정 범위

- `src/components/Label/types.ts` — `LabelMember` 타입 추가, `Label.memberIds` → `Label.members: LabelMember[]`, `Label.id` 타입 `number` → `string`
- `src/components/Label/Label.mock.ts` — 새 타입 구조에 맞게 Mock 데이터 재구성
- `src/components/Label/useLabelManager.ts` — `addMember` 시그니처 및 내부 로직 변경, 중복 방어 로직 업데이트

## 검증

- `npx tsc --noEmit` 타입 에러 없음
- Mock 기반 LabelManager 렌더링 시 멤버 닉네임 정상 표시
- 동일 멤버 중복 추가 방어 동작

## Result

### 작업 브랜치
`agent/task-02-label-type-refactor` → `feature/api-harness-setup` 머지 완료

### 수정 파일
- `src/components/Label/types.ts` — `LabelMember` 추가, `Label.id: string`, `members: LabelMember[]`
- `src/components/Label/Label.mock.ts` — 한국어 닉네임 기반 Mock 데이터 재구성
- `src/components/Label/useLabelManager.ts` — `addMember(labelId: string, memberId: number, nickname: string)`, 중복 방어 `members.some()`, `selectedLabelId: string | null`
- `src/components/Label/LabelManager.tsx` — `members.length` 표시, `addMember` 호출 시 nickname 전달
- `src/components/Label/Label.test.ts` — 새 타입 구조 기준 테스트 업데이트

### 검증 결과
- **Phase 1**: `npx tsc --noEmit` Label 파일 타입 에러 없음, `npx vitest run` 12/12 통과
- **Phase 2**: dev 서버 정상 응답, `members.length` 표시 및 중복 방어 동작 확인
- **Phase 3**: 보류 — 실제 API 연동은 Task 03에서 일괄 수행
