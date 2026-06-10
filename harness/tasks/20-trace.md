# Task 20: Trace (프로필 방문 기록)

## 배경

친구 프로필 페이지 방문 시 백엔드에 방문 기록을 남긴다.
API 응답으로 `TraceResult`가 반환되며, `revealed: true`이면 최근 서로 방문이 잦다는 신호를
방문자에게 바로 보여준다.

## 사용 API

| 액션 | API |
|---|---|
| 방문 기록 + 결과 조회 | `POST /api/v1/social/traces` `{ targetId: number }` → `TraceResult` |

```ts
TraceResult {
  revealed?: boolean;  // true면 서로 방문이 잦음
}
```

## 구현 범위

`/friends/{friendId}` 페이지(Task 16) 진입 시 Server Action으로 `recordTraceAction({ targetId: friendId })` 호출.

### 응답 처리

- `revealed: true` → 프로필 페이지에 subtle 인디케이터 표시
  - 예: "최근 서로 자주 방문했습니다" 문구 또는 아이콘
- `revealed: false` 또는 호출 실패 → 아무것도 표시하지 않음 (페이지 렌더링에 영향 없음)

### 호출 방식

프로필 데이터 병렬 조회(`getFriendProfileAction`, `getConnectionPathAction`)와 함께 서버에서 처리.
Trace는 결과에 따라 UI에 반영되므로 fire-and-forget이 아닌 **응답 대기** 방식.

```ts
const [profileResult, pathResult, traceResult] = await Promise.all([
  getFriendProfileAction(friendId),
  getConnectionPathAction(friendId),
  recordTraceAction(friendId),
]);
```

`traceResult`가 실패해도 프로필은 정상 렌더링.

## 스코프 외

- 방문 기록 목록 조회 UI
- `TRACE_REVEALED` 푸시 알림 — Task 09에서 이미 처리됨

## 검증

- `/friends/{friendId}` 진입 시 `POST /api/v1/social/traces` 호출 확인
- `revealed: true` 응답 → "최근 서로 자주 방문했습니다" 표시
- `revealed: false` 응답 → 표시 없음
- 호출 실패 → 프로필 정상 렌더링

## Result

### 완료 (2026-06-10)

**구현 파일**
- `src/app/actions/social.ts` — `recordTraceAction(targetId)` 추가
- `src/app/friends/[friendId]/page.tsx` — `Promise.all`에 `recordTraceAction` 포함, `revealed` 계산
- `src/components/FriendProfile/FriendProfile.tsx` — `revealed` prop + amber 배너 조건부 렌더링

**UI**: `revealed: true` 시 프로필 섹션 하단에 `👀 최근 서로 자주 방문했습니다` (bg-amber-50 배너)

**Phase 2 결과: 10/10 PASS**
- `/friends/{id}` 진입 시 trace 포함 Promise.all 정상 실행
- `revealed: false` → amber 배너 미표시
- trace 실패(catch) → revealed=false 유지, 프로필 정상 렌더링
- `revealed: true` 렌더링 — 조건부 렌더링 코드 확인 (`{revealed && ...}`)

**비고**: `revealed: true`는 양방향 실제 방문 누적이 필요하여 API 반복 호출만으로 트리거 불가 (백엔드 임계값 존재). 컴포넌트 렌더링 로직은 코드 분석으로 검증.

**브랜치**: `agent/task-20-trace` → `develop` 머지 완료
