# PLAN: Task 46 — Label 목록 축소와 멤버 지연 조회

배경과 계약은 `harness/tasks/46-label-member-lazy-load.md`를 따른다.

## 1. 요구사항 분석

백엔드 `LabelResult`가 `{ id, labelName, members[] }`에서 `{ id, labelName, memberCount }`로 바뀌었다. 프론트는 목록 응답만으로 멤버를 알고 있다는 가정을 제거하고, 멤버가 실제로 필요한 시점에 `GET /api/v1/labels/{labelId}/members`를 호출해야 한다.

또한 친구 프로필의 “이 친구가 속한 내 라벨”은 전체 라벨의 멤버를 역탐색하지 않고 `GET /api/v1/labels?memberId={userId}`로 조회한다.

완료 조건은 다음과 같다.

- 메인·Buzz의 라벨 목록은 `memberCount` 계약으로 정상 렌더링된다.
- 라벨 카드 선택과 멤버 추가 진입에서 필요한 라벨 멤버만 지연 조회된다.
- 같은 라벨의 성공한 멤버 조회는 현재 화면 생명주기 동안 재사용된다.
- 멤버 미조회, 로딩, 성공한 빈 목록, 실패가 구분된다.
- 추가·삭제 성공/실패에서 멤버 목록과 `memberCount`가 어긋나지 않는다.
- 친구 프로필은 `memberId` 역방향 조회를 사용하고 바텀시트 멤버를 별도 로드한다.
- `LabelResult.members` 참조가 남지 않는다.

## 2. 설계

### 2.1 Server Action

`src/app/actions/label.ts`에 다음 조회를 둔다.

```ts
getLabelsAction(memberId?: number)
getLabelMembersAction(labelId: string)
```

- `memberId`가 있을 때만 `URLSearchParams`에 추가한다.
- 멤버 응답은 `LabelMemberResult[]`로 받는다.
- 두 액션 모두 redirect error를 다시 throw하고, 그 외 실패는 `failure`와 사용자용 message를 반환한다.
- 기존 생성·삭제·멤버 추가·삭제 액션은 경로와 body가 유지되므로 반환 형태만 새 상태 관리와 맞춘다.

### 2.2 Label 화면 모델

API DTO를 UI 상태로 직접 사용하지 않는다. `src/components/Label/types.ts`의 `Label`을 다음 의미로 확장한다.

```ts
type LabelMembersStatus = "idle" | "loading" | "success" | "error";

interface Label {
  id: string;
  labelName: string;
  memberCount: number;
  members: LabelMember[];
  membersStatus: LabelMembersStatus;
}
```

- `idle + []`: 아직 조회하지 않음
- `success + []`: 실제 빈 라벨
- `error`: 마지막 조회 실패, 재시도 가능
- `memberCount`는 목록의 서버 값을 기준으로 하며 생성 응답에 없으면 0으로 정규화한다.

상태를 별도 Map으로 이중 관리하지 않고 라벨 한 항목 안에 모아 count와 members의 원자적 갱신을 쉽게 한다.

### 2.3 멤버 캐시와 중복 호출 방지

`src/components/Label/useLabelManager.ts`가 메인 그래프 화면의 라벨 멤버 상태를 소유한다.

- `ensureMembersLoaded(labelId, { force?: boolean })`
- `success`이면 캐시 반환
- `loading`이면 같은 요청을 다시 만들지 않음
- `idle/error`이면 조회 시작
- 실패 후 재시도는 `force` 없이도 허용
- 응답이 돌아올 때 라벨이 삭제됐으면 폐기
- 라벨별 request sequence 또는 Promise ref로 늦은 응답이 최신 상태를 덮지 못하게 방어

React state에는 직렬화 가능한 상태만 두고, in-flight Promise/request token은 `useRef`에 둔다.

### 2.4 라벨 선택과 그래프

`LabelManager`의 `onLabelSelect`는 멤버 ID 배열을 즉시 전달하는 현재 계약을 없애고 라벨 ID 선택만 알린다.

`src/components/socialGraph/index.tsx`의 라벨 선택 흐름에서:

1. 라벨 네트워크 조회와 `ensureMembersLoaded(labelId)`를 같은 이벤트에서 시작한다.
2. 네트워크 결과는 기존 그래프 edge/node 상태에 반영한다.
3. 멤버 결과가 도착하면 모든 member ID를 manual node 집합에 반영해 고립 멤버도 표시한다.
4. 멤버 조회 실패는 네트워크 성공 결과를 지우지 않는다.
5. 선택이 바뀐 뒤 도착한 이전 라벨 결과는 현재 그래프에 반영하지 않는다.

Task 47의 `/network/labels/{labelId}` 경로 변경은 이 태스크에서 다루지 않는다. 현재 액션을 그대로 호출하며, Task 47에서 URL만 교체할 수 있게 흐름을 분리한다.

### 2.5 멤버 추가·삭제

- 멤버 추가 UI를 열기 전에 해당 라벨 멤버 로드를 완료한다.
- 로딩 중에는 검색 입력과 추가를 비활성화한다.
- 실패하면 후보 전체를 보여주지 않고 오류와 재시도 버튼을 표시한다.
- 추가는 이미 캐시에 있는 ID면 API를 호출하지 않는다.
- 낙관적 추가 시 members append와 `memberCount + 1`을 한 state update에서 수행한다.
- 실패 시 두 값을 함께 롤백한다.
- 삭제도 removed member snapshot과 이전 count를 보관해 함께 롤백한다.
- count는 0 미만으로 내려가지 않는다.

### 2.6 친구 프로필

`src/app/users/[userId]/page.tsx`는 친구 상세와 `getLabelsAction(userId)`를 병렬 호출한다. 더 이상 `LabelResult.members.some()`으로 필터링하지 않는다.

`src/components/FriendProfile/FriendProfile.tsx`는 프로필 화면 전용의 라벨별 멤버 캐시를 갖는다.

- 라벨 칩 클릭 시 `getLabelMembersAction(labelId)` 호출
- 바텀시트에 로딩, 실패+재시도, 빈 상태, 멤버 목록을 구분 표시
- 성공한 결과는 동일 페이지에서 재사용
- 다른 라벨로 빠르게 이동해도 선택된 라벨의 결과만 표시

메인 그래프와 프로필은 서로 다른 라우트 생명주기이므로 전역 캐시를 새로 도입하지 않는다.

### 2.7 Buzz

Buzz는 라벨의 `id`, `labelName`만 사용한다. 코드 변경은 타입 오류가 발생하는 최소 범위에 한정하며 멤버 조회를 추가하지 않는다.

## 3. 생성·수정할 파일

| 파일 | 변경 |
|---|---|
| `src/app/actions/label.ts` | `memberId` query와 `getLabelMembersAction` |
| `src/app/page.tsx` | 초기 라벨을 `memberCount`, `membersStatus: idle`로 변환 |
| `src/app/users/[userId]/page.tsx` | 친구별 역방향 라벨 조회 |
| `src/components/Label/types.ts` | `memberCount`, `membersStatus` 추가 |
| `src/components/Label/useLabelManager.ts` | 지연 조회, in-flight 방지, add/remove 정합성 |
| `src/components/Label/useLabelManager.test.ts` | 캐시와 낙관적 갱신 단위 검증 |
| `src/components/Label/LabelManager.tsx` | count, 멤버 로딩·실패·빈 상태, 재시도 |
| `src/components/socialGraph/index.tsx` | 라벨 network/member 병렬 시작과 고립 노드 반영 |
| `src/components/FriendProfile/FriendProfile.tsx` | 바텀시트 멤버 지연 조회·캐시 |

`src/app/actions/buzz.ts`, `src/app/buzzes/new/page.tsx`, `src/components/Buzz/BuzzForm.tsx`는 읽기 대조 대상으로 두고 실제 타입 오류가 없으면 수정하지 않는다.

새 Mock 파일은 만들지 않는다. 이번 작업은 사용자가 제공한 실제 백엔드 계약 연동이며, UI 검증 데이터는 `harness/fixtures/users.md`, `harness/fixtures/friendships.md`를 사용한다.

## 4. 작업 순서와 세이브 포인트

### Phase 1 — 계약·상태 기반 마련

1. label 조회 Server Action 두 개 구현
2. Label UI 모델 변경
3. 메인 페이지와 사용자 프로필의 제거된 `members` 참조 교체
4. `useLabelManager` 지연 조회·캐시·낙관적 갱신 구현
5. 단위 테스트 작성
6. lint, TypeScript, 단위 테스트 통과
7. 커밋: `feat(task-46): 라벨 멤버 지연 조회 상태를 도입한다`

### Phase 2 — UI·그래프 연결

1. LabelManager 로딩·실패·빈 상태와 재시도 UI
2. 라벨 선택 시 network/member 병렬 시작
3. 고립 멤버 노드 반영
4. FriendProfile 바텀시트 지연 조회와 캐시
5. 실제 UI/상태 검증과 스크린샷
6. 커밋: `feat(task-46): 라벨 멤버 지연 조회 UI를 연결한다`

### Phase 3 — 예외와 회귀

1. 늦은 응답, 빠른 선택 전환, 중복 클릭 검증
2. 조회·추가·삭제 실패 및 롤백 검증
3. 빈 라벨·빈 멤버·삭제된 라벨 응답 검증
4. 최종 lint, TypeScript, 단위 테스트와 회귀 확인
5. 커밋: `test(task-46): 라벨 멤버 지연 조회 예외를 검증한다`

## 5. 테스트 시나리오

### Phase 1 — 정적 분석·단위 검증

- `rg "LabelResult|\.members" src/app src/components`로 API DTO의 제거 필드 참조 전수 확인
- `npm run lint`
- `npx tsc --noEmit`
- 프로젝트에 설정된 Vitest 실행 명령을 확인해 `useLabelManager.test.ts` 실행
- 최초 조회 1회, 성공 캐시 재사용, 실패 후 재시도
- 동일 라벨 중복 호출이 한 요청으로 합쳐지는지 확인
- 빈 응답은 `success + []`가 되는지 확인
- add/remove 성공, 실패 롤백, 중복 추가에서 count와 members 일치

### Phase 2 — UI·상태 검증

기본 계정 이수환(user_id=4)과 fixtures의 실제 친구·라벨 데이터를 사용한다.

- 메인 로드 직후 모든 라벨 카드 count가 서버 `memberCount`와 일치
- 활성 라벨 첫 클릭에서 network와 members 요청이 함께 시작
- 멤버 로딩 중 로딩 UI, 성공 후 칩 목록 표시
- 같은 라벨 재선택 시 멤버 API 재호출 없음
- edge가 없는 멤버도 그래프 노드에 표시
- 멤버 추가 검색에서 기존 멤버 제외
- 추가·삭제 직후 count와 칩이 동시에 갱신
- 친구 프로필에 해당 친구가 속한 라벨만 표시
- 프로필 바텀시트 첫 진입 조회와 재진입 캐시 확인
- 스크린샷:
  - `harness/verify/verify-46-01-label-count.png`
  - `harness/verify/verify-46-02-member-loaded.png`
  - `harness/verify/verify-46-03-profile-label-members.png`

### Phase 3 — 예외 상황

- 라벨 0개일 때 빈 목록 UI
- `memberCount: 0`인 라벨을 열었을 때 조회 성공 후 “멤버가 없습니다” 표시
- 멤버 조회 4xx/5xx에서 오류와 재시도 표시, 빈 상태 문구 금지
- 멤버 조회 실패 상태에서 추가 후보 노출·추가 API 호출 차단
- A 라벨 조회 중 B 라벨 선택 시 A 응답이 B 그래프/바텀시트를 덮지 않음
- 추가·삭제 API 실패 시 members와 count 모두 이전 값으로 복원
- 삭제된 라벨의 늦은 응답 폐기
- Buzz 라벨 선택과 라벨 생성·삭제 회귀 없음

## 6. 백엔드 계약 판단

아래는 구현을 막지 않는 범위에서 방어적으로 처리한다.

- 생성 응답에 `memberCount`가 없으면 0으로 정규화
- 멤버 추가·삭제 응답이 void인 현재 계약을 유지하고 프론트 낙관적 갱신 사용
- 멤버 정렬은 서버 응답 순서를 보존
- 다른 사용자의 labelId 접근 실패는 status와 무관하게 failure UI로 처리하고 빈 배열로 바꾸지 않음

배열 정렬과 403/404 구분은 사용자 동작을 바꾸지 않으므로 추가 확인 때문에 착수를 멈추지 않는다.

## 7. 제외 범위

- `/networks/**` → `/network/**` 전환과 통합 edge API: Task 47
- Label CRUD UX 재설계
- 전역 캐시 라이브러리 도입
- Buzz에 불필요한 멤버 조회 추가

## 8. 브랜치

승인 후 로컬 `main`의 `ecc2dbb`에서 `agent/task-46-label-member-lazy-load` 브랜치를 생성한다. 현재 미커밋 Task 46~48 문서는 보존하고, Task 46 구현 커밋에는 Task 47·48 문서를 포함하지 않는다.
