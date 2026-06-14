# Task 28: 라벨 API 연동 및 라벨로 그래프 렌더링

## 배경

현재 `LabelManager`는 Mock 로컬 상태(`MOCK_LABELS`)로 라벨을 관리한다.
라벨 ID가 Mock 기반이기 때문에 `getLabelNetworkAction(labelId)`가 실제 백엔드 API를 호출해도
올바른 응답을 받을 수 없어 라벨 클릭 → 그래프 렌더링이 동작하지 않는다.

이 task에서 라벨 CRUD 전체를 Server Action으로 전환하고, 라벨 카드 클릭 시 해당 라벨의
네트워크를 그래프에 렌더링한다.

---

## 백엔드 API (기존 `label-controller.ts` 기준)

| 메서드 | 경로 | 용도 |
|---|---|---|
| `GET` | `/api/v1/labels` | 내 라벨 목록 조회 → `LabelResult[]` |
| `POST` | `/api/v1/labels` | 라벨 생성 → `LabelResult` |
| `DELETE` | `/api/v1/labels/{labelId}` | 라벨 삭제 |
| `POST` | `/api/v1/labels/{labelId}/members` | 멤버 추가 |
| `GET` | `/api/v1/networks/labels/{labelId}` | 라벨 네트워크 엣지 조회 (기존 `getLabelNetworkAction` 재사용) |

`LabelCreateRequest`: `{ labelName: string }` (exposure 없음)
`LabelResult`: `{ id?: string; labelName?: string; members?: LabelMemberResult[] }`
`LabelMemberResult`: `{ id?: number; nickname?: string }`

---

## 변경 상세

### 1. Server Action 추가 — `app/actions/label.ts`

```
getLabelsAction()           → GET /api/v1/labels
createLabelAction(name)     → POST /api/v1/labels
deleteLabelAction(labelId)  → DELETE /api/v1/labels/{labelId}
addLabelMemberAction(labelId, memberId) → POST /api/v1/labels/{labelId}/members
```

모든 함수는 `"use server"`, `springClient` 사용, 401 시 redirect.

### 2. `types.ts` 수정

`exposure` 필드 제거는 Task 27에서 완료 예정.
이 task에서는 `Label.id`가 string(백엔드 UUID)임을 확정.

### 3. `useLabelManager.ts` 리팩터

- Mock 의존 제거 — 초기값을 props(`initialLabels: Label[]`)로 주입받는 구조로 변경
- `createLabel` → `createLabelAction` 호출 후 반환된 `LabelResult`로 상태 업데이트
- `addMember` → `addLabelMemberAction` 호출 후 성공 시 로컬 상태 업데이트
- `deleteLabel` → `deleteLabelAction` 호출 후 목록에서 제거 (옵션, UI에서 삭제 버튼이 있을 경우)

### 4. `LabelManager.tsx` 수정

- `initialLabels` prop 추가, `useLabelManager`에 전달
- 라벨 카드 클릭(`handleCardClick`) → `onLabelSelect(labelId)` 호출은 기존과 동일
  - 상위 `SocialGraph`의 `handleLabelSelect` → `getLabelNetworkAction(labelId)` 경로 그대로 사용

### 5. `app/page.tsx` 수정

서버 컴포넌트에서 초기 라벨 목록을 fetch하여 `SocialGraph`에 prop으로 전달.

```tsx
// page.tsx (Server Component)
const labels = await springClient.get<LabelResult[]>("/api/v1/labels");
<SocialGraph friends={friends} initialLabels={labels} ... />
```

### 6. `SocialGraph/index.tsx` 수정

`initialLabels` prop 추가 → `LabelManager`에 전달.

### 7. Mock 파일 정리

- `Label.mock.ts` — Task 27에서 `exposure` 제거 완료. 이 task에서 파일 자체 제거(더 이상 사용 안 함)
- `Label.test.ts` — Mock 의존 테스트 업데이트 또는 제거

---

## 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `src/app/actions/label.ts` | 신규: 라벨 CRUD Server Action |
| `src/app/page.tsx` | 라벨 목록 fetch → `SocialGraph`에 `initialLabels` prop 전달 |
| `src/components/socialGraph/index.tsx` | `initialLabels` prop 수신 → `LabelManager`에 전달 |
| `src/components/Label/useLabelManager.ts` | Mock 제거, Server Action 호출로 전환 |
| `src/components/Label/LabelManager.tsx` | `initialLabels` prop 추가 |
| `src/components/Label/Label.mock.ts` | 파일 삭제 |
| `src/components/Label/Label.test.ts` | Mock 의존 테스트 제거 또는 업데이트 |

---

## 검증

### Phase 1
- `npx tsc --noEmit` 에러 없음
- `npm run lint` 에러 없음

### Phase 2
- 라벨 탭 진입 시 실제 라벨 목록(백엔드 데이터)이 표시됨
- `[+ 새 라벨 만들기]` → 이름 입력 → [라벨 만들기] 클릭 → 목록에 즉시 추가됨
- 네트워크 탭에서 노드 클릭 → 라벨 탭으로 이동 → 라벨 카드의 [멤버 추가] 버튼 활성화 → 클릭 시 멤버 추가됨
- **라벨 카드 클릭 → 그래프가 해당 라벨 멤버 간 네트워크로 교체됨**
- 라벨 카드 재클릭(토글) → 그래프 초기화 또는 이전 circleSize 상태로 복귀

### Phase 3
- 멤버가 0명인 라벨 클릭 → 그래프 빈 상태 또는 안내 메시지
- 백엔드 오류 시 기존 그래프 유지 + 에러 처리

---

## Result

**완료일:** 2026-06-14  
**커밋:** `e1851ec` (develop)

### 원래 scope 대비 변경/추가된 사항

#### 버그 수정
- `getLabelNetworkAction`이 `NetworkFriendEdgeResult[]`로 파싱하던 것을 `NetworkGraphResult` + `parseNetworkGraph`로 수정 (백엔드 응답 스펙 불일치)
- 라벨 카드 클릭 시 `circleNodeIds`를 `nodeIds`(그래프 응답)와 `memberIds`(카드 멤버)의 합집합으로 세팅 — 그래프에 엣지 없는 고립 멤버도 렌더링

#### 기존 scope 이외 추가 구현
- **멤버 삭제**: `DELETE /api/v1/labels/{labelId}/members/{memberId}` → `removeLabelMemberAction` 추가, 멤버 칩에 × 버튼
- **멤버 추가 UX 교체**: 노드 클릭 기반 → 라벨 카드별 친구 검색 드롭다운 (비멤버만 필터링)
- **낙관적 업데이트**: 멤버 추가·삭제 모두 API 완료 전 즉시 그래프·로컬 상태 반영, 실패 시 롤백
- **그래프 동적 반영**: 멤버 추가 시 해당 친구의 1-hop 엣지를 `getOneHopMutualFriendEdgesAction`으로 fetch하여 엣지 추가, 삭제 시 관련 엣지 제거
- **노드 3종 시각 구분**: 기본(하늘색 solid) / 동적 추가(하늘색 dashed, `.manual`) / 2-hop 추천(청록 dashed, `.suggestion`)
- **탭명 변경**: "네트워크" → "TOP-N", "라벨 관리" → "라벨"
- **렌더링 테마 아코디언**: 라벨 탭에도 TOP-N과 동일한 테마 선택 accordion 추가
- **카메라 고정**: 렌더링 테마 전환 시 `zoomFit` 호출 제거 → 사용자 뷰포트 유지

#### 확인된 백엔드 이슈 (세션 중 수정 완료)
- `/api/v1/networks/labels/{labelId}` 가 `{ "nodes": [] }` 반환하던 백엔드 버그 → 백엔드 팀이 수정 완료

### 최종 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `src/app/actions/label.ts` | `removeLabelMemberAction` 추가 |
| `src/app/actions/social.ts` | `getLabelNetworkAction` 반환 타입 수정 |
| `src/app/test-flag-detail/page.tsx` | TS 에러 수정 (`memorialCount` 누락) |
| `src/components/Label/LabelManager.tsx` | 멤버 추가 드롭다운, × 삭제 버튼, 낙관적 업데이트 |
| `src/components/Label/useLabelManager.ts` | `removeMember` 추가, 낙관적 업데이트 패턴 적용 |
| `src/components/socialGraph/CytoscapeWrapper.tsx` | `[layout]` effect에서 `onLayoutStop` 제거 |
| `src/components/socialGraph/index.tsx` | 탭명, 테마 아코디언, `handleLabelMemberAdd/Remove` |
| `src/components/socialGraph/styles.ts` | `.manual`, `.suggestion` 노드 스타일 추가 |
| `src/components/socialGraph/useGraphData.ts` | 동적 추가 노드에 `manual` 클래스 부여 |
