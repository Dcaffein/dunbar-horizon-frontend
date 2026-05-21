# Task 01: NetworkFriendEdge 타입 확장 및 interest 레이아웃 단순화

## 배경

백엔드 `NetworkFriendEdgeResult`에 `friendAInterest`, `friendBInterest` 두 필드가 추가됐다.
유저가 friendA, friendB 각각에 대해 가지는 관심도(0~1)로, 기존 interest 레이아웃 테마가 노드를 거쳐 간접 조회하던 값과 동일한 의미다.
엣지 자체에 값이 실리므로 노드 lookup 없이 바로 참조할 수 있다.

## 수정 범위

- `src/components/socialGraph/types.ts` — `NetworkFriendEdge`에 두 필드 추가
- `src/components/socialGraph/useGraphData.ts` — 엣지 data 객체에 두 필드 전달
- `src/components/socialGraph/layout.ts` — interest 테마 `edgeElasticity`, `idealEdgeLength`에서 노드 조회 제거, 엣지 data 직접 참조로 교체

## 검증

- `npx tsc --noEmit` 타입 에러 없음
- interest 테마로 그래프 렌더링 시 레이아웃 이상 없음
- 두 필드 모두 `undefined`일 때 `|| 0` 방어로 기존과 동일하게 동작

## Result

### 작업 브랜치
`agent/task-01-network-edge-type-extension` → `feature/api-harness-setup` 머지 완료

### 수정 파일
- `src/components/socialGraph/types.ts` — `NetworkFriendEdge`에 `friendAInterest?`, `friendBInterest?` 추가
- `src/components/socialGraph/useGraphData.ts` — 엣지 data 객체에 두 필드 전달
- `src/components/socialGraph/layout.ts` — interest 테마 `edgeElasticity`, `idealEdgeLength`를 노드 lookup에서 엣지 data 직접 참조로 교체 (`|| 0` undefined 방어 포함)

### 검증 결과
- **Phase 1**: `npx tsc --noEmit` 타입 에러 없음 (기존 구조적 에러는 Task 01과 무관한 선행 문제)
- **Phase 2**: dev 서버 정상 기동, 컴파일 에러 없음. `|| 0` 방어로 두 필드 미존재 시 기존과 동일하게 동작 확인
- **Phase 3**: 보류 — 신규 API(`GET /networks/me?circleSize=`)는 Task 03에서 연동 예정. Task 03 Phase 3 완료 시 `friendAInterest`/`friendBInterest` 실값 수신 및 interest 레이아웃 동작 통합 검증
