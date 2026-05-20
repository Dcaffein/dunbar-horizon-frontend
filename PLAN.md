# PLAN: Task 04 — LabelManager UX 재설계 (Option C: 인라인 액션 구조)

> 참조 태스크: `harness/tasks/04-label-manager-ux.md`
> 작업 브랜치: `agent/task-04-label-manager-ux`

---

## 1. 배경 및 UX 결정

라벨 탭에서 라벨 클릭 시 해당 라벨 멤버 간 네트워크를 그래프에 표시해야 한다.
두 관심사(그래프 교체 트리거 + 멤버 관리)를 하나의 패널에서 다룬다.

**Option C 채택**: 카드 클릭 = 그래프 교체, 관리 액션(멤버 추가)은 카드 내 인라인

---

## 2. 수정할 파일

| 파일 | 변경 내용 |
|---|---|
| `src/components/Label/LabelManager.tsx` | Props 추가, 카드 구조 재설계, 생성 폼 토글화, 하단 섹션 제거 |

> `useLabelManager.ts`는 수정하지 않는다. `selectLabel`은 유지하되 LabelManager에서 더 이상 호출하지 않는다.

---

## 3. 변경 상세

### Props 인터페이스

```ts
// 기존
interface LabelManagerProps {
  selectedNodeId: string | null;
  friends: FriendshipDetail[];
}

// 변경 후
interface LabelManagerProps {
  selectedNodeId: string | null;
  friends: FriendshipDetail[];
  onLabelSelect: (labelId: string | null) => void;  // 추가
  activeLabelId: string | null;                     // 추가
}
```

### 내부 상태 변경

```ts
// 제거: selectedLabelId (내부), selectLabel 호출
// 추가: isCreateFormOpen (생성 폼 토글용)
const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
```

> `useLabelManager`에서 `labels`, `createLabel`, `addMember`만 사용한다.

### 레이아웃 구조

```
[+ 새 라벨 만들기] 버튼            ← 클릭 시 생성 폼 토글
  ↓ (isCreateFormOpen === true)
  생성 폼 (labelName + exposure + 라벨 만들기 버튼)
  생성 완료 시 폼 자동 닫힘

내 라벨 (N)
  ┌─────────────────────────────────┐
  │  [카드 전체 클릭 → onLabelSelect]│
  │  고등학교 동창   2명  공개        │
  │                      [+ 멤버]   │ ← selectedNodeId 없으면 비활성
  └─────────────────────────────────┘
  ※ activeLabelId 일치 시 카드 강조 스타일

기존 하단 "선택한 친구를 라벨에 추가" 섹션 → 제거
```

### 핵심 핸들러

```ts
// 카드 클릭: 이미 활성이면 null로 해제, 아니면 해당 id로 선택
function handleCardClick(labelId: string) {
  onLabelSelect(activeLabelId === labelId ? null : labelId);
}

// 멤버 추가: 카드별로 독립 호출 (selectedLabelId 없이 labelId 직접 전달)
function handleAddMember(labelId: string) {
  if (!selectedNodeId || !selectedFriend) return;
  const memberId = Number(selectedNodeId);
  const nickname = selectedFriend.friendAlias || selectedFriend.friendNickname;
  addMember(labelId, memberId, nickname);
}

// 라벨 생성 완료 후 폼 닫기
function handleCreateLabel() {
  const error = createLabel(request);
  if (error?.labelName) { setFormError(error.labelName); return; }
  setIsCreateFormOpen(false);   // ← 자동 닫힘
  ...
}
```

---

## 4. 테스트 시나리오

### Phase 1 — 정적 분석
- `npx tsc --noEmit` — LabelManager 파일 타입 에러 없음
- `npm run lint` — 신규 에러 없음
- 성공 시 커밋: `feat(task04): LabelManager UX 재설계 (Option C)`

### Phase 2 — UI/상태 검증 (Mock 기반)
- `[+ 새 라벨 만들기]` 버튼 클릭 시 폼 토글 동작
- 라벨 생성 완료 후 폼 자동 닫힘, 목록에 추가됨
- 라벨 카드 클릭 시 `onLabelSelect` 호출, `activeLabelId` 강조 스타일 적용
- `selectedNodeId` 없을 때 `[+ 멤버]` 버튼 비활성
- `selectedNodeId` 있을 때 `[+ 멤버]` 클릭 시 해당 라벨 members에 추가
- 동일 친구 중복 추가 방어
- 성공 시 커밋: `test(task04): Phase 2 UI/상태 검증 통과`

### Phase 3
- 실제 API 연동은 Task 03에서 일괄 수행
