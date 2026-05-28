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

## UI 구조

친구 요청 플로우는 **그래프와 분리된 전용 페이지**(`/requests`)에서 처리한다.

```
/requests
┌──────────────────────────────────────┐
│  [받은 요청]  [보낸 요청]  [친구 찾기]  │  ← 탭 (기본: 받은 요청)
├──────────────────────────────────────┤
│  (탭 내용)                            │
└──────────────────────────────────────┘
```

- 수락/숨기기/취소는 `/requests` 페이지 내에서만 수행
- 수락 후 `/` 이동 시 서버 컴포넌트가 최신 friends[]를 자연스럽게 재조회 → 그래프에 새 친구 반영
- 그래프 로컬 state(circleSize 선택, edges) 리셋 없음
- 별도 상태 동기화 로직 불필요

## 상태 동기화

수락/숨기기/취소 모두 응답 body가 `void`이므로 200 OK 후 로컬 state 업데이트(해당 요청을 목록에서 제거).
수락 후 그래프 반영은 `/`로 이동할 때 서버 컴포넌트 재실행으로 자동 처리 — 별도 콜백·재조회 불필요.

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

**완료일**: 2026-05-29
**브랜치**: `agent/task-07-friend-request-flow`

### 구현 파일

| 파일 | 변경 |
|---|---|
| `src/app/actions/friendRequest.ts` | 신규 — Server Actions 7개 |
| `src/app/requests/page.tsx` | 신규 — Server Component (초기 데이터 병렬 조회) |
| `src/components/FriendRequest/FriendRequestPage.tsx` | 신규 — 탭 UI (받은 요청·보낸 요청·친구 찾기) |
| `src/components/FriendRequest/useFriendRequest.ts` | 신규 — 비즈니스 로직 훅 |
| `src/app/page.tsx` | 수정 — 헤더에 친구 요청 링크 추가 |

### Phase 2 검증 결과 (Playwright headless)

| 항목 | 결과 |
|---|---|
| 메인 헤더 친구 요청 링크 | ✅ |
| 탭 3개 렌더링 (받은 요청·보낸 요청·친구 찾기) | ✅ |
| 받은 요청 탭 렌더링 | ✅ |
| 보낸 요청 탭 렌더링 | ✅ |
| 검색 탭 UI (입력창·검색 버튼) | ✅ |
| 존재하지 않는 이메일 → 백엔드 에러 메시지 노출 | ✅ |
| 뒤로가기 → 메인 이동 | ✅ |

### Phase 3 검증 결과 (실제 API)

| 항목 | 결과 |
|---|---|
| 이메일 검색 → 유저 카드 노출 | ✅ |
| 요청 전송 → "이미 요청을 보냈습니다" UI 반영 | ✅ |
| 보낸 요청 탭 — 요청 카드 존재 | ✅ |
| 보낸 요청 취소 → 목록에서 제거 | ✅ |
| 중복 요청 방어 | ✅ |

> 백엔드 이슈 (수정 완료): `GET /api/v1/friend-requests/sent` DateTime 직렬화 버그 → 500, `POST /api/v1/friend-requests` 응답 직렬화 버그 → 500. 백엔드 수정 후 모두 정상.
