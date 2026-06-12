# PLAN: Task 27 — 메인 그래프 UI/UX 개선

## 요구사항

`harness/tasks/27-main-graph-ui-improvements.md` 기반.
메인 그래프 페이지(`/`)의 5가지 UI 개선 사항을 일괄 반영한다.

## 변경 상세 및 구현 전략

### 1. circleSize 버튼 레이아웃 (`index.tsx`)

- `CIRCLE_SIZE_LABELS` 값에서 숫자 제거 (`"SUPPORT ~5"` → `"SUPPORT"`)
- 버튼 컨테이너 클래스 `grid grid-cols-2` → `grid grid-cols-4`
- 버튼 높이 `py-2` → `py-1.5`

### 2. FriendActionPanel 친밀도 제거 (`FriendActionPanel.tsx`)

- `<p className="text-xs text-gray-400 mt-0.5">친밀도 {intimacyPct}%</p>` 줄 제거
- `intimacyPct` 변수 선언도 함께 제거

### 3. 헤더 친구 수 제거 (`app/page.tsx`)

- `<p>총 <span>…</span>명의 친구가 있습니다</p>` 블록 제거

### 4. 줌 컨트롤 추가

**`CytoscapeWrapper.tsx`**
- cytoscape 초기화 시 `minZoom: 0.1, maxZoom: 5.0` 추가
- elements useEffect에서 `fit: true` 방식 → `fit: false` + `layoutstop` 콜백 방식으로 교체:
  - 비-lazy-load(최초 렌더링)일 때 레이아웃 완료 후 `cy.zoom(1.0)` + `cy.center()` 호출
  - lazy-load일 때는 기존처럼 현재 줌/팬 유지
  ```ts
  const layoutInstance = cy.layout({ ...layout, fit: false });
  if (!isLazyLoadUpdate) {
    layoutInstance.one("layoutstop", () => {
      cy.zoom(1.0);
      cy.center();
    });
  }
  layoutInstance.run();
  ```
- 배경: 현재 `fit: true`는 노드 수에 따라 배율이 너무 작게 자동 계산됨 (0.2~0.4 수준). 초기 배율을 노드 클릭 줌인 수준(1.0)으로 고정.

**`socialGraph/index.tsx`**
- `<main>` 영역 내 우하단 오버레이로 +/- 버튼 추가 (`isGraphActive` 시 표시)
- 클릭 핸들러:
  ```ts
  function handleZoomIn()  { cyRef.current?.zoom(cyRef.current.zoom() * 1.2); }
  function handleZoomOut() { cyRef.current?.zoom(cyRef.current.zoom() / 1.2); }
  ```
- `cyRef`는 이미 `index.tsx`에 있으므로 `CytoscapeWrapper` 추가 props 불필요

### 5. 라벨 exposure 전체 제거

| 파일 | 변경 내용 |
|---|---|
| `Label/types.ts` | `Label.exposure`, `LabelCreateRequest.exposure` 필드 제거 |
| `Label/Label.mock.ts` | 각 mock 객체의 `exposure` 필드 제거 |
| `Label/useLabelManager.ts` | `newLabel` 생성 시 `exposure: request.exposure` 제거 |
| `Label/LabelManager.tsx` | `exposureInput` state 및 토글 JSX 제거, 카드 내 공개/비공개 배지 제거, `handleCreateLabel`에서 `exposure` 필드 제거 |

## 수정 파일 목록

| 파일 | 변경 |
|---|---|
| `src/app/page.tsx` | 친구 수 `<p>` 블록 제거 |
| `src/components/socialGraph/index.tsx` | circleSize 버튼 수정, 줌 버튼 오버레이 추가 |
| `src/components/socialGraph/CytoscapeWrapper.tsx` | `minZoom`, `maxZoom` 추가 |
| `src/components/FriendActionPanel/FriendActionPanel.tsx` | 친밀도 줄 제거 |
| `src/components/Label/types.ts` | `exposure` 필드 제거 |
| `src/components/Label/useLabelManager.ts` | `exposure` 로직 제거 |
| `src/components/Label/Label.mock.ts` | `exposure` 필드 제거 |
| `src/components/Label/LabelManager.tsx` | 공개여부 토글·배지 제거 |

## 테스트 시나리오

### Phase 1 (정적 분석)
- `npx tsc --noEmit` 에러 없음
- `npm run lint` 에러 없음

### Phase 2 (UI 동작)
- circleSize 버튼 4개가 일열로 표시, 레이블 숫자 없음 (SUPPORT / SYMPATHY / KINSHIP / DUNBAR)
- FriendActionPanel에서 "친밀도 N%" 텍스트 미노출
- 헤더에 "총 N명의 친구가 있습니다" 텍스트 미노출
- 그래프 우하단에 +/- 버튼 오버레이 표시 (그래프 활성 시)
- +/- 클릭 시 그래프 줌 인/아웃 동작
- 노드 클릭 시 기존 zoom-to-node 동작 유지
- 라벨 생성 폼에 "공개 여부" 토글 없음
- 라벨 카드에 공개/비공개 배지 없음

### Phase 3 (엣지 케이스)
- circleSize 미선택 상태에서 줌 버튼 클릭 → 에러 없음 (그래프 비활성 시 버튼 미표시)
- 줌 최소/최대 경계에서 버튼 클릭 시 무한 축소/확대 없음 (`minZoom: 0.1`, `maxZoom: 5.0`)
