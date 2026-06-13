# PLAN.md — Task 29: Buzz UI/UX 개선

## 1. 요구사항 분석 및 작업 범위

Task 29 명세(`harness/tasks/29-buzz-ui-improvements.md`) 기반.

| 파일 | 변경 내용 |
|---|---|
| `src/components/Buzz/BuzzList.tsx` | 목록 전체를 `max-w-2xl mx-auto` 래퍼로 감싸 중앙 정렬 |
| `src/components/Buzz/BuzzForm.tsx` | ① 탭명 `"Anchor"` → `"수신자 추천"` ② Anchor 섹션 레이블 `"Anchor 친구"` → `"기준 친구"` + 설명 문구 추가 ③ 파일 업로드 → 커스텀 버튼 UI |
| `src/components/Buzz/BuzzDetail.tsx` | ① `max-w-2xl mx-auto` 중앙 정렬 ② 비공개 댓글 체크박스 → 잠금 아이콘 토글 |

새로 생성하는 파일 없음. Mock 변경 없음.

---

## 2. 변경 상세

### BuzzList.tsx
- `<div>` 최상위 래퍼를 `<div className="max-w-2xl mx-auto">` 로 변경

### BuzzForm.tsx
- **탭명**: `t === "ANCHOR" ? "Anchor"` → `"수신자 추천"`
- **Anchor 섹션 레이블**: `"Anchor 친구"` → `"기준 친구"`
- **설명 문구**: 드롭다운 위에 `<p className="text-xs text-gray-400 mb-1.5">선택한 친구를 기준으로 관련도 높은 친구들이 자동으로 수신자로 등록됩니다.</p>` 추가
- **파일 업로드**:
  - `<input type="file">` hidden 처리
  - `useRef<HTMLInputElement>` 로 trigger
  - `[📎 이미지 첨부]` 버튼 → 클릭 시 `fileInputRef.current?.click()`
  - 선택 후 파일명(1개) or `N장 선택됨`(복수) 텍스트 표시

### BuzzDetail.tsx
- 본문 스크롤 영역(`flex-1 overflow-y-auto` 내부) 및 댓글 섹션을 `max-w-2xl mx-auto` 로 중앙 정렬
- 비공개 댓글 토글:
  - 기존 `<label><input type="checkbox"> 공개</label>` 제거
  - 상태명 `isPublic` 유지 (`BuzzCommentRequest.isPublic` 필드와 일치)
  - 버튼: `isPublic === true` → `🔓 공개` / `false` → `🔒 비공개 · 작성자에게만 표시`
  - `addCommentAction` / `updateCommentAction` 호출 시 기존과 동일하게 `isPublic` 전달

---

## 3. 테스트 시나리오

### Phase 1 — 정적 분석
- [ ] `npx tsc --noEmit` 에러 없음
- [ ] `npm run lint` 에러 없음

### Phase 2 — UI/State 검증
- [ ] `/buzzes` 목록이 화면 중앙 좁게 표시됨
- [ ] `/buzzes/new` 첫 탭이 `"수신자 추천"` 으로 표시
- [ ] ANCHOR 탭: 드롭다운 위에 `"기준 친구"` 레이블 + 설명 문구 표시
- [ ] `[📎 이미지 첨부]` 버튼 클릭 → 파일 선택 다이얼로그 열림
- [ ] 파일 선택 후 파일명 / 개수 텍스트 표시
- [ ] `/buzzes/{id}` 상세가 중앙 좁게 표시됨
- [ ] 댓글 입력창 아래 `🔓 공개` 기본 표시
- [ ] 클릭 시 `🔒 비공개 · 작성자에게만 표시` 전환

### Phase 3 — Edge Case
- [ ] 파일 선택 후 다시 클릭, 다른 파일 선택 → 상태 정상 갱신
- [ ] 파일 선택 취소(다이얼로그 닫기) → 기존 선택 파일 유지
- [ ] 비공개 상태에서 댓글 전송 → API에 `isPublic: false` 전달됨 (Network 탭 확인)
