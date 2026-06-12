# Task 30: 유저 프로필 페이지 (`/users/{id}`) 신설

## 배경

현재 `/friends/{id}`는 친구 전용 프로필 페이지다.
"친구 찾기" 검색 결과는 인라인 카드로만 표시되고 있어, 비친구 유저의 프로필을 조회할 수 있는
독립적인 페이지가 없다.

`GET /api/v1/social/users/{id}` API가 존재하므로(`SocialProfileResult: id, nickname, profileImageUrl`),
이를 활용해 `/users/{id}` 페이지를 신설하고 친구/비친구 여부에 따라 UI를 분기한다.

---

## 변경 흐름

```
친구 찾기 이메일 검색 → 유저 found
  └─ 기존: 인라인 카드 + 친구 요청 버튼
  └─ 변경: router.push("/users/{id}") 로 이동

/users/{id} (Server Component)
  ├─ GET /api/v1/social/users/{id}  → SocialProfileResult (공개 프로필)
  ├─ GET /api/v1/friends            → friends[]
  │
  ├─ friends에 id 있음 (친구)
  │    └─ getFriendProfileAction(id) 추가 호출
  │       → 기존 FriendProfile 컴포넌트 재사용
  │
  └─ friends에 id 없음 (비친구)
       → PublicProfile 컴포넌트 (닉네임 + 프로필 이미지 + [친구 요청 보내기])
```

---

## 변경 상세

### 1. Server Action 추가 — `app/actions/social.ts`

```ts
getSocialProfileAction(userId: number)
  → GET /api/v1/social/users/{userId}
  → { success, data: SocialProfileResult }
```

### 2. 신규 라우트 — `src/app/users/[userId]/page.tsx`

- `getSocialProfileAction(userId)` 호출 — 실패 시 404
- `getFriendsAction()` (기존 Server Action 재사용) → friends[]
- `isFriend = friends.some(f => f.friendId === userId)`
- `isFriend` 여부에 따라 분기:
  - 친구 → `getFriendProfileAction(userId)` + `getConnectionPathAction(userId)` + `recordTraceAction(userId)` 호출 → `<FriendProfile />` 렌더링
  - 비친구 → `<PublicProfile profile={socialProfile} />` 렌더링

### 3. 신규 컴포넌트 — `src/components/UserProfile/PublicProfile.tsx`

비친구 유저 프로필 UI:
- 프로필 이미지 (없으면 letter avatar)
- 닉네임
- `[친구 요청 보내기]` 버튼 → `sendFriendRequestAction(userId)` 호출
- 전송 완료 시 "친구 요청을 보냈습니다." 메시지 + 버튼 비활성화

### 4. `FriendRequestPage.tsx` 수정

- `searchStatus === "found"` 인라인 카드 제거
- 유저 found 시 `router.push("/users/${result.id}")` 로 이동

### 5. `FriendActionPanel.tsx` 수정

- "프로필 보기" 링크: `/friends/${friendId}` → `/users/${friendId}` 로 변경

### 6. 기존 `/friends/{id}` 처리

- `src/app/friends/[friendId]/page.tsx` → `/users/${friendId}` 로 redirect 추가
- (점진적 통합 — 기존 북마크/링크 호환성 유지)

---

## 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `src/app/actions/social.ts` | `getSocialProfileAction` 추가 |
| `src/app/users/[userId]/page.tsx` | 신규 — 유저 프로필 페이지 |
| `src/components/UserProfile/PublicProfile.tsx` | 신규 — 비친구 공개 프로필 컴포넌트 |
| `src/components/FriendRequest/FriendRequestPage.tsx` | 검색 결과 found → `/users/{id}` 이동 |
| `src/components/FriendActionPanel/FriendActionPanel.tsx` | "프로필 보기" 링크 경로 변경 |
| `src/app/friends/[friendId]/page.tsx` | `/users/{friendId}` redirect 추가 |

---

## 검증

### Phase 1
- `npx tsc --noEmit` 에러 없음
- `npm run lint` 에러 없음

### Phase 2
- 친구 찾기에서 이메일 검색 → 유저 found → `/users/{id}` 로 이동
- 비친구 유저 프로필: 닉네임 + 프로필 이미지 + [친구 요청 보내기] 버튼 표시
- [친구 요청 보내기] 클릭 → "친구 요청을 보냈습니다." + 버튼 비활성화
- 친구 유저 URL(`/users/{friendId}`) 직접 접근 → 기존 FriendProfile UI 표시
- 그래프 노드 → "프로필 보기" → `/users/{id}` 로 이동 정상 동작
- `/friends/{id}` 직접 접근 → `/users/{id}` redirect 동작

### Phase 3
- 존재하지 않는 userId → 404 처리
- 이미 친구 요청을 보낸 유저의 프로필 → 버튼 상태 처리 (백엔드 응답 기반)
