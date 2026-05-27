# Task 07: 친구 요청 플로우

## 배경

`sendFriendRequest`에 `receiverId`가 필요해 유저 검색 없이는 친구 요청을 시작할 수 없었다.
백엔드에 `GET /api/v1/users/search?email=` 추가로 이메일 → userId 조회가 가능해졌다.

이메일 직접 입력 방식은 의도된 설계다 — 이미 아는 사람만 연결하는 Dunbar Horizon의 철학에 맞고,
낯선 사람의 무작위 접근을 차단한다. 새로운 인연 발견은 Task 08(2-hop 추천)에서 커버한다.

## 사용 API

| 액션 | API |
|---|---|
| 이메일로 유저 조회 | `GET /api/v1/users/search?email=` → `UserProfileInfo { id, nickname, profileImage }` |
| 친구 요청 보내기 | `POST /api/v1/friend-requests` `{ receiverId: number }` |
| 받은 요청 목록 | `GET /api/v1/friend-requests` → `FriendRequestResult[]` |
| 요청 수락 | `POST /api/v1/friend-requests/{id}/accept` |
| 요청 숨기기 | `POST /api/v1/friend-requests/{id}/hide` |
| 보낸 요청 목록 | `GET /api/v1/friend-requests/sent` |
| 보낸 요청 취소 | `DELETE /api/v1/friend-requests/{id}` |

**거절 없음**: 백엔드에 reject API가 없다. 숨기기(`HIDDEN`)가 사실상 거절 역할이며 되돌릴 수 있다.

## 주요 흐름

**요청 보내기**: 이메일 입력 → 유저 조회 → 결과 확인 → 요청 전송

**수신함**: 받은 요청 목록(PENDING) → 수락 또는 숨기기

**보낸 요청**: 보낸 요청 목록 → 취소

## 상태 동기화

수락/숨기기/취소 모두 응답 body가 `void`이므로 Task 06과 동일하게 200 OK 후 로컬 state 업데이트.
수락 후 그래프에 새 친구 노드 즉시 반영 여부는 PLAN 단계에서 결정 (로컬 추가 vs 페이지 진입 시 갱신).

## 스코프 외

- 숨긴 요청 목록 + 숨기기 취소 — 낮은 우선순위, 별도 반영
- 2-hop 추천에서 바로 요청 보내기 — Task 08과 연계

## 검증

- 존재하지 않는 이메일 조회 시 안내 메시지 표시
- 이미 친구인 유저 조회 시 요청 버튼 비활성 또는 안내
- 이미 요청을 보낸 유저 중복 요청 방어
- 요청 수락 후 그래프에 새 친구 반영
- `npx tsc --noEmit` 에러 없음

## Result

<!-- 작업 완료 후 기록 -->
