# Task 46: Label 목록 축소와 멤버 지연 조회

## 상태

미착수. 새 OpenAPI 계약 반영 확인 완료.

## 배경

`GET /api/v1/labels`의 `LabelResult`에서 `members[]`가 제거되고 `memberCount`가 추가됐다. 라벨 멤버는 기존 `GET /api/v1/labels/{labelId}/members`로 별도 조회하며, 특정 친구가 속한 내 라벨은 새 query로 역방향 조회할 수 있다.

```text
GET /api/v1/labels
→ LabelResult[] { id, labelName, memberCount }

GET /api/v1/labels?memberId={userId}
→ 해당 사용자가 속한 LabelResult[]

GET /api/v1/labels/{labelId}/members
→ LabelMemberResult[] { id, nickname }
```

기존 화면은 목록 응답의 `members[]`를 라벨 카드, 멤버 관리, 그래프 고립 노드, 친구 프로필에서 직접 소비하므로 단순 타입 교체로 끝나지 않는다.

## 목표

- 라벨 목록은 `memberCount`만으로 렌더링한다.
- 멤버가 필요한 순간에만 조회하고 같은 라벨의 결과를 재사용한다.
- 멤버 추가·삭제 시 멤버 캐시와 `memberCount`를 일관되게 갱신한다.
- 친구 프로필은 `GET /labels?memberId=`로 소속 라벨만 조회한다.
- API 실패를 빈 멤버 목록으로 오인하지 않는다.

## 범위

### Server Action

`src/app/actions/label.ts`

- `getLabelsAction(memberId?: number)` 또는 별도 `getLabelsByMemberAction(memberId)` 추가
- `getLabelMembersAction(labelId)` 추가
- query는 `URLSearchParams`로 구성한다.
- redirect error는 반드시 다시 throw한다.
- 조회 실패는 `failure`를 보존해 빈 상태와 구분한다.

### 프론트 Label 모델

`src/components/Label/types.ts`

목록 메타데이터와 로드된 멤버 상태를 구분한다. 구체적인 표현은 구현 시 선택할 수 있으나 다음 상태를 구별해야 한다.

- 아직 조회하지 않음
- 조회 중
- 조회 성공: 빈 배열 포함
- 조회 실패

`members: []` 하나로 미조회와 실제 빈 라벨을 동시에 나타내면 안 된다.

### 메인 페이지와 LabelManager

`src/app/page.tsx`

- `LabelResult.members` 변환 제거
- `memberCount ?? 0` 전달

`src/components/Label/useLabelManager.ts`

- 라벨별 멤버 캐시와 in-flight 중복 호출 방지
- 라벨 선택 또는 멤버 추가 UI 진입 시 `ensureMembersLoaded(labelId)` 실행
- 생성 성공 시 `memberCount`가 없으면 0으로 정규화
- 멤버 추가 성공 시 캐시 추가와 count `+1`
- 멤버 삭제 성공 시 캐시 제거와 count `-1`
- 실패 시 낙관적 변경을 정확히 롤백
- 중복 멤버 추가는 count를 올리지 않음

`src/components/Label/LabelManager.tsx`

- 접힌 카드는 `memberCount` 표시
- 선택된 카드의 칩은 로딩·실패·빈 상태를 구분
- 멤버 추가 후보 필터는 멤버 로드 완료 후 적용
- 로드 실패 상태에서 이미 속한 친구를 후보로 노출하지 않도록 추가 동작을 막고 재시도 제공

### 라벨 네트워크

`src/components/socialGraph/index.tsx`

- 라벨 선택 시 네트워크와 멤버를 병렬 조회
- `GET /network/labels/{labelId}`가 반환하지 않는 고립 멤버도 멤버 응답으로 노드에 포함
- 멤버 조회만 실패한 경우 네트워크 전체를 빈 상태로 만들지 않고 부분 실패를 표시

네트워크 URL 변경 자체는 Task 47 범위다. Task 46은 멤버 데이터를 연결하는 책임만 가진다.

### 친구 프로필

`src/app/users/[userId]/page.tsx`

- 전체 라벨을 받아 `members.some(...)`으로 필터링하는 로직 제거
- 친구 프로필과 `GET /labels?memberId={userId}`를 병렬 조회

`src/components/FriendProfile/FriendProfile.tsx`

- 소속 라벨 칩은 목록 결과로 렌더링
- 라벨 바텀시트를 열 때 해당 라벨 멤버를 지연 조회
- 재진입 시 캐시 재사용, 실패 시 재시도 제공

### Buzz

`src/app/actions/buzz.ts`, `src/app/buzzes/new/page.tsx`, `src/components/Buzz/BuzzForm.tsx`

Buzz는 `id`, `labelName`만 사용하므로 동작 변경은 없다. `LabelResult.members`를 가정하는 변환이 없는지만 확인한다.

## 수정 예상 파일

| 파일 | 변경 |
|---|---|
| `src/app/actions/label.ts` | memberId 필터, 멤버 조회 액션 |
| `src/app/page.tsx` | `memberCount` 기반 초기 라벨 변환 |
| `src/app/users/[userId]/page.tsx` | 역방향 라벨 조회 |
| `src/components/Label/types.ts` | 목록 메타데이터와 멤버 로딩 상태 |
| `src/components/Label/useLabelManager.ts` | 지연 조회·캐시·낙관적 갱신 |
| `src/components/Label/LabelManager.tsx` | count, 로딩·실패·빈 상태 UI |
| `src/components/socialGraph/index.tsx` | 라벨 network/member 병렬 조회 |
| `src/components/FriendProfile/FriendProfile.tsx` | 바텀시트 멤버 지연 조회 |

Mock을 사용한다면 `src/components/Label/Label.mock.ts`에 fixtures 기반 데이터로 배치한다. 실제 연동은 사용자가 명시적으로 승인한 구현 단계에서만 수행한다.

## 백엔드 계약 확인

- `GET /labels/{id}/members` 정렬 기준이 안정적으로 보장되는가?
- 다른 사용자의 labelId는 403, 404, 빈 배열 중 무엇을 반환하는가?
- `POST /labels` 응답에 `memberCount: 0`이 항상 포함되는가?
- 멤버 추가·삭제 응답은 계속 `void`인가?

첫 두 항목은 UX와 오류 분기에 영향을 주므로 구현 착수 전에 확인한다. 생성 응답에 count가 없으면 프론트가 0으로 정규화할 수 있다.

## 제외 범위

- 네트워크 API의 `/networks` → `/network` 경로 변경: Task 47
- Label CRUD UI 재설계
- 전역 데이터 캐시 라이브러리 도입

## 검증

### Phase 1 — 정적 분석·단위 검증

- `rg "\.members" src`로 제거된 `LabelResult.members` 참조가 남지 않았는지 확인
- `npm run lint`
- `npx tsc --noEmit`
- 캐시 로직 단위 테스트: 최초 조회, 재사용, 중복 in-flight, 빈 결과, 실패 후 재시도
- add/remove 성공·실패·중복에서 `memberCount`와 members가 일치하는지 검증

### Phase 2 — UI·상태

fixtures의 이수환(user_id=4)과 실제 친구 데이터를 사용한다.

- 메인 진입 시 라벨 카드에 `memberCount` 표시
- 라벨 첫 선택 시 network/member 요청 병렬 실행
- 같은 라벨 재선택 시 멤버 중복 요청 없음
- 멤버 추가 검색에서 기존 멤버 제외
- 추가·삭제 직후 count와 칩이 함께 변경
- 친구 프로필에 해당 친구가 속한 라벨만 표시
- 프로필 라벨 바텀시트 첫 진입 로드와 재진입 캐시 확인
- 스크린샷은 `harness/verify/verify-46-*.png`로 저장

### Phase 3 — 예외

- 라벨 0개, 멤버 0명
- 멤버 조회 4xx/5xx 후 실패 표시와 재시도
- 빠른 라벨 전환 시 늦은 응답이 다른 라벨에 섞이지 않음
- 추가·삭제 실패 시 count와 멤버 모두 롤백
- 삭제된 라벨의 늦은 멤버 응답을 폐기
- 다른 사용자 labelId 접근 실패를 빈 라벨로 표시하지 않음

각 Phase 통과 후 저장소 정책에 따라 세이브 포인트 커밋을 만든다.

## 브랜치

`agent/task-46-label-member-lazy-load`
