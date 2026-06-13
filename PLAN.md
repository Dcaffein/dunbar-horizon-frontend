# PLAN.md — Task 28: 라벨 API 연동 및 라벨로 그래프 렌더링

## 1. 현황 분석

| 현재 문제 | 원인 |
|---|---|
| 라벨 카드 클릭 → 그래프 교체 안 됨 | `useLabelManager`가 Mock ID("1","2","3")로 관리 → `getLabelNetworkAction(labelId)` 호출 시 실제 UUID가 아니라 실패 |
| 라벨 생성/멤버추가가 로컬 상태에만 반영 | Server Action 없이 `Date.now().toString()` 가짜 ID 사용 |

## 2. 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `src/app/actions/label.ts` | **신규** — 4개 Server Action |
| `src/app/page.tsx` | 라벨 목록 fetch → `SocialGraph`에 `initialLabels` prop 전달 |
| `src/components/socialGraph/index.tsx` | `SocialGraphProps`에 `initialLabels` 추가 → `LabelManager`에 전달 |
| `src/components/Label/useLabelManager.ts` | Mock 제거, `initialLabels` props 주입, 비동기 Server Action 호출 |
| `src/components/Label/LabelManager.tsx` | `initialLabels` prop 추가, `createLabel`·`addMember` async 처리 |
| `src/components/Label/Label.mock.ts` | **삭제** |
| `src/components/Label/Label.test.ts` | Mock import 제거, `describe("MOCK_LABELS")` 블록 삭제 |

## 3. 변경 상세

### `src/app/actions/label.ts` (신규)

```ts
"use server"
getLabelsAction()                        → GET  /api/v1/labels
createLabelAction(labelName: string)     → POST /api/v1/labels          → LabelResult
deleteLabelAction(labelId: string)       → DELETE /api/v1/labels/{id}
addLabelMemberAction(labelId, memberId)  → POST /api/v1/labels/{id}/members
```

모두 `apiClient` 사용, 에러 시 `{ success: false, message }` 반환, 401 시 redirect.

### `useLabelManager.ts` 핵심 변경

- 시그니처: `useLabelManager(initialLabels: Label[])` — `MOCK_LABELS` 제거
- `createLabel`: validation 통과 후 `createLabelAction` 호출 → 반환된 `LabelResult`로 상태 추가. `async` 변환.
- `addMember`: `addLabelMemberAction` 호출 성공 시 로컬 상태 업데이트. `async` 변환.
- `UseLabelManagerResult.createLabel` 반환 타입: `Promise<LabelFormError | null>`
- `UseLabelManagerResult.addMember` 반환 타입: `Promise<void>`

### `LabelManager.tsx` 변경 사항

- `initialLabels: Label[]` prop 추가 → `useLabelManager(initialLabels)` 전달
- `handleCreateLabel`: `async` 로 변환, `await createLabel(request)` 처리
- `handleAddMember`: `async` 로 변환, `await addMember(...)` 처리
- 생성/멤버추가 중 로딩 스피너 없이 버튼 disabled 처리 (isSubmitting 상태 추가)

### `LabelResult` → `Label` 매핑

백엔드 `LabelResult.members` 는 `LabelMemberResult[]` (`id?: number, nickname?: string`).
로컬 `Label.members` 는 `LabelMember[]` (`id: number, nickname: string`).
→ 변환 헬퍼: `members: (r.members ?? []).map(m => ({ id: m.id!, nickname: m.nickname ?? "" }))`

---

## 4. 테스트 시나리오

### Phase 1
- [ ] `npx tsc --noEmit` 에러 없음
- [ ] `npm run lint` 에러 없음

### Phase 2
- [ ] 메인 페이지 진입 → 라벨 탭 클릭 → 실제 백엔드 라벨 목록 표시
- [ ] `[+ 새 라벨 만들기]` → 이름 입력 → [라벨 만들기] → 목록에 즉시 추가
- [ ] 네트워크 탭에서 노드 클릭 → 라벨 탭으로 이동 → [멤버 추가] 클릭 → 성공
- [ ] **라벨 카드 클릭 → 그래프가 해당 라벨 멤버 간 네트워크로 교체**
- [ ] 라벨 재클릭(토글) → 그래프 초기화

### Phase 3
- [ ] 멤버 0명인 라벨 클릭 → 빈 그래프 또는 안내 (기존 동작 그대로)
- [ ] 라벨 생성 시 빈 이름 / 20자 초과 → 유효성 에러 메시지 표시
