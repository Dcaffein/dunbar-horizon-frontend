# Task 16: 친구 프로필 + 연결 경로

## 배경

그래프 노드 클릭, Flag 참가자 목록 등 여러 진입점에서
친구의 프로필을 조회하고, 나와의 연결 경로(중개인)를 확인하는 페이지.

Task 22(경로 탐색)를 이 태스크에 통합한다.

## 사용 API

| 액션 | API |
|---|---|
| 친구 프로필 조회 | `GET /api/v1/friends/{friendId}` → `FriendshipDetailResult` |
| 연결 경로 조회 | `GET /api/v1/networks/path?targetId={friendId}` → `ConnectionPathResult` |

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

ConnectionPathResult {
  direct?: boolean;
  intermediaries?: IntermediaryResult[];  // 중개인 최대 1명
}

IntermediaryResult {
  userId?: number;
  nickname?: string;
  score?: number;  // UI에 노출하지 않음
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
│  ──────────────────────────────  │
│  연결 경로                        │
│  직접 연결된 친구입니다.           │
│  또는                             │
│  박민준을 통해 연결됩니다.         │
└──────────────────────────────────┘
```

- `direct: true` → "직접 연결된 친구입니다."
- `direct: false`, intermediaries[0] 존재 → "**{nickname}**을 통해 연결됩니다."
- 친밀도(score) 수치는 UI에 노출하지 않음
- 친구가 아닌 유저 접근 시 → `/` 리다이렉트 (API 403/404)
- 네트워크에 던지기 기능 없음

## 데이터 페칭

두 API를 서버 컴포넌트에서 병렬 조회.

```ts
const [profile, pathResult] = await Promise.all([
  getFriendProfile(friendId),
  getConnectionPath({ targetId: friendId }),
]);
```

경로 조회 실패 시 연결 경로 섹션만 숨김 — 프로필은 정상 표시.

## 스코프 외

- 비친구 유저 프로필 조회
- 친구 관계 설정(alias 변경 등) — Task 06 FriendActionPanel에서 처리
- 함께하는 Flag 목록 — 전용 API 없음, 추후 태스크

## 검증

- `/friends/{friendId}` 진입 → 닉네임·별칭·프로필 이미지 표시
- `direct: true` → "직접 연결된 친구입니다." 표시
- `direct: false` → 중개인 닉네임 포함 문구 표시
- 경로 API 실패 → 프로필은 정상 표시, 경로 섹션만 숨김
- 비친구 접근 → 리다이렉트
- `npx tsc --noEmit` 에러 없음

## Result

### 완료 (2026-06-10)

**구현 파일**
- `src/app/actions/friendship.ts` — `getFriendProfileAction`, `getConnectionPathAction` 추가
- `src/app/friends/[friendId]/page.tsx` — 신규 서버 컴포넌트 (병렬 조회, 비친구 접근 시 `/` 리다이렉트)
- `src/components/FriendProfile/FriendProfile.tsx` — 신규 클라이언트 컴포넌트
- `src/components/FriendActionPanel/FriendActionPanel.tsx` — "프로필 보기" Link 추가
- `src/components/Flag/FlagDetail.tsx` — 참가자 중 친구인 경우 `/friends/{id}` 링크 처리

**Phase 2 결과: 9/9 PASS**
- 프로필 페이지 정상 로드 (닉네임·아바타·헤더 표시)
- `direct: true` → "직접 연결된 친구입니다." 표시
- 비친구 ID (`/friends/999999`) 접근 → `/` 리다이렉트
- FriendActionPanel 프로필 보기 링크 컴포넌트 확인

**브랜치**: `agent/task-16-user-profile` → `develop` 머지 완료
