# Task 27: 메인 그래프 UI/UX 개선

## 배경

스크린샷 캡처 후 UI 검토를 통해 발견한 메인 그래프 페이지(`/`) 관련 개선사항을 일괄 반영한다.

---

## 변경 상세

### circleSize 버튼 레이아웃

| 항목 | 현재 | 변경 |
|---|---|---|
| 레이아웃 | `grid grid-cols-2` (2×2 배치) | `grid grid-cols-4` (일열 배치) |
| 버튼 레이블 | `SUPPORT ~5`, `SYMPATHY ~15`, `KINSHIP ~50`, `DUNBAR ~150` | `SUPPORT`, `SYMPATHY`, `KINSHIP`, `DUNBAR` (숫자 제거) |
| 버튼 크기 | `py-2 text-xs` | `py-1.5 text-xs` (높이 축소) |

### FriendActionPanel

| 항목 | 현재 | 변경 |
|---|---|---|
| 친밀도 표시 | "친밀도 N%" 텍스트 줄 노출 | 제거 |

### 헤더 친구 수

| 항목 | 현재 | 변경 |
|---|---|---|
| 위치 | `app/page.tsx` 헤더 타이틀 아래 `<p>총 N명의 친구가 있습니다</p>` | 제거 |

### 줌 컨트롤

| 항목 | 내용 |
|---|---|
| 추가 위치 | 그래프 영역 우하단 오버레이 (+/- 버튼) |
| 기본 줌 | 그래프 활성화 시 초기 줌 1.0 (노드 클릭 zoom in 수준) |
| 동작 | `+` → `cy.zoom(현재 * 1.2)` / `-` → `cy.zoom(현재 / 1.2)`, 중심 고정 |
| 노드 클릭 줌 인 | 기존 behavior 유지 (`zoom: 1.0`, `center: { eles: node }`) |

### 라벨 공개/비공개 제거

라벨 관련 `exposure` 개념 전체 제거. 백엔드 `LabelCreateRequest`에도 `exposure` 필드가 없음 (orval 생성 모델 확인).

| 항목 | 현재 | 변경 |
|---|---|---|
| 라벨 생성 폼 | "공개 여부" 토글 | 제거 |
| 라벨 카드 | "공개" / "비공개" 배지 | 제거 |
| `types.ts` | `Label.exposure`, `LabelCreateRequest.exposure` | 필드 제거 |
| `useLabelManager.ts` | `exposure` 파라미터 전달 로직 | 제거 |
| `Label.mock.ts` | `exposure` 필드 | 제거 |
| `LabelManager.tsx` | `exposureInput` state, 토글 JSX | 제거 |

---

## 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `src/app/page.tsx` | "총 N명의 친구가 있습니다" `<p>` 블록 제거 |
| `src/components/socialGraph/index.tsx` | circleSize 버튼 레이아웃/레이블 수정, 줌 버튼 오버레이 추가 |
| `src/components/socialGraph/CytoscapeWrapper.tsx` | 줌 버튼용 `cy` ref 외부 노출 또는 콜백 추가 (이미 `cy` prop 있음) |
| `src/components/FriendActionPanel/FriendActionPanel.tsx` | "친밀도 N%" 줄 제거 |
| `src/components/Label/types.ts` | `exposure` 필드 제거 |
| `src/components/Label/useLabelManager.ts` | `exposure` 로직 제거 |
| `src/components/Label/Label.mock.ts` | `exposure` 필드 제거 |
| `src/components/Label/LabelManager.tsx` | 공개여부 토글 제거, 배지 제거 |

---

## 검증

### Phase 1
- `npx tsc --noEmit` 에러 없음
- `npm run lint` 에러 없음

### Phase 2
- circleSize 버튼 4개가 일열로 표시, 숫자 없이 SUPPORT / SYMPATHY / KINSHIP / DUNBAR
- FriendActionPanel에서 친밀도 수치가 보이지 않음
- 헤더에 "총 N명의 친구가 있습니다" 텍스트 없음
- 그래프 우하단에 +/- 버튼이 오버레이로 표시
- +/- 클릭 시 그래프 줌 인/아웃 동작
- 노드 클릭 시 기존 zoom-to-node 동작 유지
- 라벨 생성 폼에 공개여부 토글 없음
- 라벨 카드에 공개/비공개 배지 없음

### Phase 3
- circleSize 미선택 상태에서 줌 버튼 클릭 → 에러 없음
- 줌 최소/최대 경계에서 버튼 클릭 시 무한 축소/확대 되지 않음 (cy.zoom min/maxZoom 설정 확인)
