# Task 20: Trace (프로필 방문 기록)

## 배경

친구 프로필 페이지 방문 시 백엔드에 방문 기록을 남긴다.
두 유저가 서로 프로필 방문이 잦아지면 `TRACE_REVEALED` 알림으로 서로에게 알려준다.
방문 기록 자체는 유저에게 직접 노출되지 않는다.

## 사용 API

| 액션 | API |
|---|---|
| 방문 기록 | `POST /api/v1/social/traces` `{ targetId: number }` |

## 구현 범위

`/friends/{friendId}` 페이지(Task 16) 진입 시 자동으로 `recordTrace({ targetId: friendId })` 호출.

Server Action에서 처리. 실패해도 페이지 렌더링에 영향 없음 (fire-and-forget).

## 스코프 외

- 방문 기록 조회 UI — 유저에게 미노출
- 알림 처리 — `TRACE_REVEALED` 알림은 Task 09에서 이미 처리됨

## 검증

- `/friends/{friendId}` 진입 시 `POST /api/v1/social/traces` 호출 확인
- 호출 실패 시 페이지 정상 렌더링

## Result

<!-- Task 16과 함께 구현 -->
