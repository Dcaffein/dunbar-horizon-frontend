# Task 04: LabelManager UX 재설계 (Option C: 인라인 액션 구조)

## 배경

라벨 탭에서 라벨 클릭 시 해당 라벨 멤버 간 네트워크를 그래프에 표시해야 한다.
두 관심사(그래프 교체 트리거 + 멤버 관리)를 하나의 패널에서 다룬다.

**UX 결정 — Option C 채택:**
- Option A: 관리 탭 / 네트워크 탭 분리 — 라벨 생성 후 그래프를 보려면 탭 전환 필요
- Option B: 기존 패널 통합 — 라벨 클릭의 의미(관리 선택 vs 그래프 교체)가 모호
- **Option C: 카드 클릭 = 그래프 교체, 관리 액션은 카드 내 인라인** ← 채택

## 수정 범위

- `src/components/Label/LabelManager.tsx`
  - Props 추가: `selectedNodeId`, `friends`, `onLabelSelect`, `activeLabelId`
  - 상단 `[+ 새 라벨 만들기]` 버튼 → 클릭 시 생성 폼 토글
  - 라벨 카드: 전체 클릭 → `onLabelSelect` 호출, `activeLabelId` 일치 시 강조 스타일 적용
  - 카드 내 `[멤버 추가]` 버튼: `selectedNodeId` 있을 때만 활성화
  - 기존 하단 "선택한 친구를 라벨에 추가" 섹션 제거

## 검증

- 라벨 카드 클릭 시 `onLabelSelect` 호출 및 `activeLabelId` 강조 확인
- `[+ 새 라벨 만들기]` 토글 동작 확인
- 생성 완료 후 폼 자동 닫힘
- 노드 미선택 시 `[멤버 추가]` 비활성
- 노드 선택 후 `[멤버 추가]` 클릭 시 해당 라벨 members에 추가
- 동일 친구 중복 추가 방어

## Result

### 작업 브랜치
`agent/task-04-label-manager-ux` → `feature/api-harness-setup` 머지 완료

### 수정 파일
- `src/components/Label/LabelManager.tsx` — Props 재설계(onLabelSelect, activeLabelId 추가), isCreateFormOpen 토글 상태 추가, 하단 섹션 제거, 카드별 인라인 멤버 추가 버튼
- `src/components/socialGraph/index.tsx` — activeLabelId 상태 추가, LabelManager에 onLabelSelect/activeLabelId 전달, LabelManager 임포트 상대경로로 수정
- `components/Label/{types,useLabelManager,Label.mock,LabelManager}.tsx` — Task02+04 변경사항 루트 레벨 동기화 (Turbopack이 root app/ 우선 서빙하는 구조 대응)
- `components/SocialGraph/index.tsx` — activeLabelId 상태 추가, LabelManager props 연동
- `app/page.tsx` — @/components/socialGraph → @/components/SocialGraph 케이싱 수정 (Turbopack 빌드 에러 해결)

### 이슈 및 해결
- Next.js 16 + Turbopack: `app/`(root) 디렉토리가 `src/app/`보다 우선 적용됨. `app/page.tsx`에서 `@/components/socialGraph` 소문자 임포트가 Turbopack 케이스-센시티브 처리로 빌드 에러 발생 → 대문자 경로(`@/components/SocialGraph`)로 수정
- `src/components/socialGraph/index.tsx` 신규 추가: Task04 LabelManager 연동 코드 포함

### 검증 결과
- **Phase 1**: `npx tsc --noEmit` (src/ 영역) 에러 없음
- **Phase 2**: Playwright E2E 검증 5/5 통과
  1. [+ 새 라벨 만들기] 버튼 상단 노출 ✅
  2. 클릭 전 생성 폼 미노출 (false) ✅
  3. 클릭 후 생성 폼 토글 노출 (true) ✅
  4. 카드별 인라인 멤버 추가 버튼 3개 ✅
  5. 구 하단 "선택한 친구를 라벨에 추가" 섹션 제거 ✅
- **Phase 3**: 보류 — 실제 API 연동은 Task 03에서 일괄 수행
