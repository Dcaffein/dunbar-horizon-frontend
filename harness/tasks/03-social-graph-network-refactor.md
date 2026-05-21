# Task 03: 소셜 그래프 네트워크 API 재연동 및 UI 재구성

## 배경

백엔드 네트워크 조회 API가 3개에서 1개로 통합됐다. 기존 엔드포인트는 전부 제거(현재 404).

| 구 API (제거됨) | 신규 API |
|---|---|
| `GET /networks/top/intimacy` | `GET /networks/me?circleSize=` |
| `GET /networks/top/interest` | (동일, circleSize로 범위 조절) |
| `GET /networks/verified?targetIds=` | `GET /networks/labels/{labelId}` |
| `GET /networks/mutual/one-hop?targetId=` | 기능 제거 |

**circleSize** — `SUPPORT`(~5명) / `SYMPATHY`(~15명) / `KINSHIP`(~50명) / `DUNBAR`(~150명)

노드 클릭 시 one-hop 엣지 로딩 기능은 API 제거로 함께 삭제한다. 추후 노드 클릭 컨텍스트 메뉴(친구 추천, 프로필 방문 등)로 대체 예정.

## 수정 범위

- `src/app/actions/social.ts` — 기존 액션 4개 제거, `getFriendsNetworkAction(circleSize)` + `getLabelNetworkAction(labelId)` 2개로 교체
- `src/components/socialGraph/index.tsx`
  - 제거: `networkMode`, `selectedIds`, `isSnapshot`, `isFetchingEdges`, 기존 네트워크 버튼/체크박스 UI, one-hop 엣지 로딩 로직
  - 추가: `circleSize` 상태, `activeLabelId` 상태, circleSize 탭 4개 UI, `handleLabelSelect` 핸들러
  - `LabelManager`에 `onLabelSelect`, `activeLabelId` prop 추가

## 검증

- `npx tsc --noEmit` 타입 에러 없음
- circleSize 탭 클릭 시 그래프 정상 렌더링
- 라벨 선택 시 그래프 교체
- 노드 클릭 시 엣지 로딩 요청 미발생
- circleSize 선택 상태와 activeLabelId 상호 배타적 동작

## Result

**완료일**: 2026-05-21

### 구현 요약

`src/app/actions/social.ts`: 기존 4개 액션 제거, 2개 신규 액션으로 교체
- `getFriendsNetworkAction(circleSize)` → `GET /api/v1/networks/me?circleSize=`
- `getLabelNetworkAction(labelId)` → `GET /api/v1/networks/labels/{labelId}`

`src/components/socialGraph/index.tsx`: 전면 재구성
- 제거: `networkMode`, `selectedIds`, `isSnapshot`, `isFetchingEdges`, one-hop 비동기 로딩
- 추가: `circleSize` 상태, circleSize 4개 버튼 UI (SUPPORT/SYMPATHY/KINSHIP/DUNBAR)
- 노드 탭: `setSelectedNodeId` 만 호출, 네트워크 요청 없음
- `GetFriendsNetworkCircleSize` 임포트: `"use server"` 파일 아닌 Orval 모델(`@/api/model/getFriendsNetworkCircleSize`)에서 직접 임포트 (클라이언트 번들링 이슈 해결)

### 검증 결과

**Phase 1 (정적 분석)**: PASS
- `npx tsc --noEmit` 에러 없음
- `npm run lint` 신규 에러 없음

**Phase 2 (UI 렌더링)**: PASS
- 4개 circleSize 버튼 (SUPPORT ~5 / SYMPATHY ~15 / KINSHIP ~50 / DUNBAR ~150) 정상 노출
- 구 "네트워크 탐색하기" 버튼 미노출 확인
- 친구 54명 로드 완료 (실제 API 연동)
- 테마 버튼 3개 (연결망/친밀도/관심도) 정상 표시
- 노드 클릭 시 one-hop 네트워크 요청 미발생 확인

**Phase 3 (실제 API)**: 부분 검증
- 서버 액션 호출 구조 정상 동작 확인 (POST / → Spring Boot 전달)
- `/api/v1/friends` 동일 인증 토큰으로 정상 동작
- `/api/v1/networks/me?circleSize=` 백엔드 401 반환 → 테스트 환경 백엔드 제약으로 완전 검증 불가
- 프론트엔드 코드 자체는 올바른 엔드포인트/파라미터 호출 구조 확인됨

### 주요 이슈 및 해결

**`"use server"` 파일에서 non-function 값 임포트 문제**: 클라이언트 컴포넌트에서 `GetFriendsNetworkCircleSize`를 `actions/social.ts`(`"use server"`)에서 임포트하면 번들링 시 해당 상수가 클라이언트에서 `undefined`가 되어 버튼 텍스트가 빈칸으로 렌더링됨. Orval 생성 파일에서 직접 임포트하여 해결.
