# PLAN: Label 멤버 칩 클릭 → 그래프 하이라이트

## 요구사항

라벨 탭에서 멤버 칩을 클릭하면 그래프에서 해당 친구 노드를 하이라이트하고 줌 이동.

## 수정 파일

| 파일 | 변경 내용 |
|---|---|
| `src/components/Label/LabelManager.tsx` | `onMemberClick` prop 추가, 멤버 칩 클릭 핸들링 |
| `src/components/socialGraph/index.tsx` | `onMemberClick` 콜백 전달 |

## 변경 상세

### 1. LabelManager.tsx
- `LabelManagerProps`에 `onMemberClick?: (memberId: number) => void` 추가
- 멤버 칩 `<span>`에 `onClick={() => onMemberClick?.(m.id)}` + `cursor-pointer` 추가
- × 버튼에 `e.stopPropagation()` 추가 (삭제 클릭이 하이라이트 트리거 방지)

### 2. index.tsx
- `LabelManager`에 `onMemberClick={(id) => { clearSuggestions(); setSelectedNodeId(String(id)); }}` 전달
- 기존 `selectedNodeId` useEffect가 하이라이트 + zoomToNode 처리

## 테스트 시나리오

1. 라벨 탭 → 라벨 선택 → 그래프 로드
2. 멤버 칩 클릭 → 해당 노드 하이라이트 + 줌 이동
3. × 버튼 클릭 → 하이라이트 없이 멤버 삭제만 동작
