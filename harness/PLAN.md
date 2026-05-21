# PLAN: 라벨 생성 및 친구 할당 기능 개발

> 참조 태스크: `harness/tasks/labelComponent`

---

## 1. 요구사항 분석 및 작업 범위

### 핵심 기능
- **라벨 생성**: `labelName`(최대 20자), `exposure`(공개 여부) 필드를 포함한 폼
- **멤버 추가**: 라벨을 선택한 뒤, 그래프 노드(친구)를 해당 라벨의 멤버로 추가
- **UI**: 기존 `SocialGraph` 사이드바와 어우러지는 추가 패널 형태

### 작업 범위
- Mock 데이터 기반으로 개발 (실제 API 연결 없음)
- 상태는 클라이언트 로컬 상태(`useState`)로 관리
- 기존 `SocialGraph` 컴포넌트의 노드 클릭 이벤트(`selectedNodeId`)와 연동

---

## 2. 생성/수정할 파일 목록

### 신규 생성

```
components/Label/
  ├─ types.ts               # Label 도메인 TS 인터페이스 정의
  ├─ Label.mock.ts          # 한국어 Mock 데이터 (라벨 3개 이상)
  ├─ useLabelManager.ts     # 라벨 생성/멤버 추가 비즈니스 로직 훅
  └─ LabelManager.tsx       # 라벨 관리 UI 컴포넌트 (사이드 패널)
```

### 수정

```
components/socialGraph/index.tsx   # LabelManager 패널 연동, selectedNodeId 전달
```

---

## 3. 타입 설계 (`components/Label/types.ts`)

```ts
// harness/DOMAIN_TERMS.md 준수
interface Label {
  id: number;
  labelName: string;       // 최대 20자
  exposure: boolean;       // 공개 여부
  memberIds: number[];     // friendId 배열
}

interface LabelCreateRequest {
  labelName: string;
  exposure: boolean;
}

interface LabelMemberAddRequest {
  memberId: number;        // friendId와 매핑
}
```

---

## 4. Mock 데이터 설계 (`components/Label/Label.mock.ts`)

```ts
// 한국어 기반 실감 나는 예시 데이터 3개
export const MOCK_LABELS: Label[] = [
  { id: 1, labelName: "고등학교 동창", exposure: true,  memberIds: [101, 102] },
  { id: 2, labelName: "회사 동료",     exposure: false, memberIds: [103] },
  { id: 3, labelName: "운동 모임",     exposure: true,  memberIds: [] },
];
```

---

## 5. 훅 설계 (`useLabelManager.ts`)

```
상태:
  - labels: Label[]                 (초기값: MOCK_LABELS)
  - selectedLabelId: number | null  (현재 선택된 라벨)

액션:
  - createLabel(req: LabelCreateRequest): void
      → labelName 20자 초과 시 에러 반환
      → 성공 시 labels 배열에 추가
  - addMember(labelId: number, memberId: number): void
      → 중복 추가 방어
  - selectLabel(id: number | null): void
```

---

## 6. UI 설계 (`LabelManager.tsx`)

```
[라벨 관리] 탭 버튼 → SocialGraph 사이드바 하단에 섹션 추가

섹션 1 — 라벨 생성 폼
  - labelName 입력 (placeholder: "라벨 이름", 20자 제한 카운터 표시)
  - exposure 토글 (공개 / 비공개)
  - "라벨 만들기" 버튼

섹션 2 — 라벨 목록
  - 라벨 카드 리스트 (클릭 시 selectedLabelId 설정)
  - 선택된 라벨 카드에 강조 표시

섹션 3 — 멤버 추가 (selectedNodeId가 있을 때 활성화)
  - "현재 선택된 친구: {label}" 표시
  - "이 친구를 라벨에 추가하기" 버튼
  - selectedLabelId가 없으면 버튼 비활성화
```

---

## 7. SocialGraph 연동 방식

`components/socialGraph/index.tsx`에서 `selectedNodeId`와 `friends`를 `LabelManager`에 props로 전달한다. 기존 사이드바 내부 하단 영역에 `<LabelManager />` 를 추가한다.

---

## 8. 테스트 시나리오 (Phased Test Plan)

### Phase 1 — 정적 분석 및 단위 검증
- `npm run lint` 통과 확인
- `npx tsc --noEmit` 타입 에러 없음 확인
- `useLabelManager.ts` 단위 테스트 (`Label.test.ts`):
  - `createLabel`: labelName 20자 초과 시 에러 반환
  - `createLabel`: 정상 입력 시 labels 배열에 추가됨
  - `addMember`: 중복 memberId 추가 방어
- 통과 시 1차 커밋

### Phase 2 — UI 및 상태 검증
- `LabelManager` 렌더링 확인 (Mock 라벨 3개 노출)
- 라벨 생성 폼 제출 후 리스트에 즉시 반영되는지 확인
- 그래프 노드 클릭 시 `selectedNodeId`가 `LabelManager`에 전달되는지 확인
- 라벨 선택 + 노드 선택 상태에서 "추가하기" 버튼 클릭 시 `memberIds`에 반영되는지 확인
- 통과 시 2차 커밋

### Phase 3 — 예외 상황 (Edge Cases)
- labelName 20자 초과 입력 시 폼이 차단되는가
- labelName이 빈 문자열일 때 제출 차단되는가
- 노드를 선택하지 않은 상태에서 멤버 추가 버튼이 비활성화되는가
- 라벨을 선택하지 않은 상태에서 멤버 추가 버튼이 비활성화되는가
- 동일 친구를 동일 라벨에 두 번 추가 시도 시 중복 방어가 동작하는가
- 통과 시 최종 커밋 및 작업 완료 보고
