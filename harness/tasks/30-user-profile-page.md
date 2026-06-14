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
  │
  ├─ GET /api/v1/friends/{id}  (getFriendProfileAction)  ← 블로킹 (친구 여부 판단)
  │    ├─ 200 성공 → isFriend = true, FriendshipDetailResult 보유
  │    └─ 실패(404) → isFriend = false
  │
  ├─ isFriend = true
  │    └─ <FriendProfile /> 렌더링 (기존 컴포넌트 재사용)
  │         └─ useEffect: recordTraceAction(id)  ← 클라이언트에서 fire-and-forget
  │              └─ revealed = true → trace 카드 노출
  │
  └─ isFriend = false
       ├─ GET /api/v1/social/users/{id}  (getSocialProfileAction)  ← 블로킹
       │    └─ 실패 시 redirect("/")
       └─ <PublicProfile /> 렌더링
            └─ useEffect: recordTraceAction(id)  ← 동일하게 fire-and-forget
                 └─ revealed = true → trace 카드 노출
```

- `recordTraceAction`은 클라이언트에서 비동기로 호출 — 실패해도 프로필 조회는 영향 없음
- `getConnectionPathAction`은 서버에서 선제 호출하지 않음 — 버튼 클릭 시 호출
- 전체 친구 목록(`GET /api/v1/friends`)을 매번 호출하지 않고,
  `GET /api/v1/friends/{id}` 성공/실패로 친구 여부를 판단한다.

---

## 변경 상세

### 1. Server Action 추가 — `app/actions/social.ts`

```ts
getSocialProfileAction(userId: number)
  → GET /api/v1/social/users/{userId}
  → { success, data: SocialProfileResult }
```

### 2. 신규 라우트 — `src/app/users/[userId]/page.tsx`

- `getFriendProfileAction(userId)` 호출 (블로킹)
  - 성공 → `<FriendProfile profile={...} userId={userId} />`
  - 실패 → `getSocialProfileAction(userId)` 호출 — 실패 시 `redirect("/")`
         → `<PublicProfile profile={socialProfile} userId={userId} />`

### 3. 신규 컴포넌트 — `src/components/UserProfile/PublicProfile.tsx`

비친구 유저 프로필 UI:
- 프로필 이미지 (없으면 letter avatar)
- 닉네임
- trace 카드: `useEffect`에서 `recordTraceAction(userId)` 호출 → `revealed = true`이면 표시
  - 표시 문구: 👀 "최근 서로 자주 방문했습니다"
- `[친구 요청 보내기]` 버튼 → `sendFriendRequestAction(userId)` 호출
- 전송 완료 시 "친구 요청을 보냈습니다." 문구 + 버튼 비활성화
- `[Buzz 보내기]` 버튼 → `router.push("/buzzes/new?to=${userId}")`

### 3-1. `FriendProfile.tsx` 수정

- `revealed` prop 제거 — 컴포넌트 내부 state로 전환
- `userId` prop 추가
- `useEffect(() => { recordTraceAction(userId).then(r => { if (r?.data?.revealed) setRevealed(true); }); }, [userId])`
- trace 카드: `revealed = true`이면 표시 (기존 amber 카드 유지)
- 연결 경로 — 서버 선제 fetch 없앰, `path` prop 제거
  - "연결 경로 보기" 버튼 추가 (Client Component)
  - 버튼 클릭 → `getConnectionPathAction(userId)` 호출 → 결과를 버튼 아래에 카드로 표시

#### 연결 경로 UI 상세

```
[관련도 높은 친구 찾기]   ← 클릭 전
     ↓ 클릭 (로딩)
─────────────────────────
intermediaries 없음:
  공통 연결 고리를 찾을 수 없습니다.

intermediaries[0] 있음:
  OO님을 통한 연결이 자연스러워 보입니다.
─────────────────────────
```

score 수치는 UI에 노출하지 않음.

### 4. `FriendRequestPage.tsx` 수정

- `searchStatus === "found"` 인라인 카드 제거
- 유저 found 시 `router.push("/users/${result.id}")` 로 이동

### 5. `FriendActionPanel.tsx` 수정

- "프로필 보기" 링크: `/friends/${friendId}` → `/users/${friendId}` 로 변경

### 6. 기존 `/friends/{id}` 처리

- `src/app/friends/[friendId]/page.tsx` → `redirect("/users/${friendId}")` 로 교체
- 기존 링크 호환성 유지, 향후 제거 가능

---

## 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `src/app/actions/social.ts` | `getSocialProfileAction` 추가 |
| `src/app/users/[userId]/page.tsx` | 신규 — 유저 프로필 페이지 |
| `src/components/UserProfile/PublicProfile.tsx` | 신규 — 비친구 공개 프로필 컴포넌트 |
| `src/components/FriendProfile/FriendProfile.tsx` | `revealed` 내부 state 전환, `userId` prop 추가, 연결 경로 lazy 버튼 |
| `src/components/FriendRequest/FriendRequestPage.tsx` | 검색 결과 found → `/users/{id}` 이동 |
| `src/components/FriendActionPanel/FriendActionPanel.tsx` | "프로필 보기" 링크 경로 변경 |
| `src/app/friends/[friendId]/page.tsx` | `/users/{friendId}` redirect 추가 |
| `src/app/buzzes/new/page.tsx` | `searchParams.to` 읽어 초기 수신자 세팅 |

---

## 검증

### Phase 1
- `npx tsc --noEmit` 에러 없음
- `npm run lint` 에러 없음

### Phase 2
- 친구 찾기에서 이메일 검색 → 유저 found → `/users/{id}` 로 이동
- 비친구 유저 프로필: 닉네임 + 프로필 이미지 표시
- 페이지 로드 직후 trace 카드는 없다가, recordTraceAction 결과 revealed=true이면 카드 출현
- [친구 요청 보내기] 클릭 → "친구 요청을 보냈습니다." + 버튼 비활성화
- [Buzz 보내기] 클릭 → `/buzzes/new?to={userId}` 로 이동, 해당 유저가 수신자로 미리 세팅됨
- 친구 유저 URL(`/users/{friendId}`) 직접 접근 → FriendProfile UI 표시
- FriendProfile — "관련도 높은 친구 찾기" 버튼 클릭 → 로딩 후 텍스트 카드 표시
  - intermediaries 없음: "공통 연결 고리를 찾을 수 없습니다."
  - intermediaries 있음: "OO님을 통한 연결이 자연스러워 보입니다."
- 그래프 노드 → "프로필 보기" → `/users/{id}` 로 이동 정상 동작
- `/friends/{id}` 직접 접근 → `/users/{id}` redirect 동작

### Phase 3
- 존재하지 않는 userId → redirect("/")
- 이미 친구 요청을 보낸 유저의 프로필 → 버튼 상태 처리 (백엔드 응답 기반)
- recordTraceAction 실패해도 프로필 페이지는 정상 표시 (trace 카드만 안 뜸)
