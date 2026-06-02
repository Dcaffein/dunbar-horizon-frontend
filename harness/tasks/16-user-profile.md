# Task 16: 친구 프로필 조회

## 배경

그래프 노드 클릭, Flag 참가자 목록 등 여러 진입점에서
친구의 소셜 프로필을 조회하는 페이지가 필요하다.

`GET /api/v1/friends/{friendId}` → `FriendshipDetailResult`로 친구 관계 정보와 프로필을 함께 조회한다.

## 사용 API

| 액션 | API |
|---|---|
| 친구 프로필 조회 | `GET /api/v1/friends/{friendId}` → `FriendshipDetailResult` |

```ts
FriendshipDetailResult {
  friendId?: number;
  friendNickname?: string;
  friendProfileImageUrl?: string;
  friendAlias?: string;
  intimacy?: number;
  myInterestScore?: number;
  isMuted?: boolean;
  isRoutable?: boolean;
}
```

## 진입점

| 위치 | 트리거 |
|---|---|
| 그래프 FriendActionPanel | 친구 노드 클릭 → 패널에 프로필 링크 |
| `/flags/{id}` 참가자 목록 | 참가자 닉네임 클릭 |

## UI 구조

### `/friends/{friendId}` — 친구 프로필 페이지

```
/friends/{friendId}
┌──────────────────────────────────┐
│  [프로필 이미지]                  │
│  별칭: 민준이  (friendAlias)      │
│  닉네임: 박민준                   │
│                                   │
│  함께하는 Flag                    │
│  ├─ 주말 등산 모임 · 토요일        │
│  └─ 금요일 맥주 · 내일 오후 7시   │
└──────────────────────────────────┘
```

- 친구가 아닌 유저 접근 시 → 404 또는 `/` 리다이렉트 (API 자체가 403/404 반환)
- 네트워크에 던지기 기능 없음 — 그래프에서 드래그 앤 드롭으로 처리 (별도 태스크)

## 상태 동기화

읽기 전용 — 별도 mutation 없음. 서버 컴포넌트 단일 조회.

## 스코프 외

- 비친구 유저 프로필 조회 — 별도 API 필요 시 추후 태스크
- 친구 관계 설정(alias 변경 등)은 Task 06 FriendActionPanel에서 처리

## 검증

- `/friends/{friendId}` 진입 시 닉네임·프로필 이미지·친밀도 표시
- 비친구 접근 시 적절한 처리
- `npx tsc --noEmit` 에러 없음

## Result

<!-- 작업 완료 후 기록 -->
