# PLAN: Task 30 — 유저 프로필 페이지 (`/users/{id}`) 신설

## 요구사항 분석

비친구 유저 프로필을 독립 페이지로 조회할 수 없는 문제를 해결한다.
`GET /api/v1/social/users/{id}` API를 활용해 `/users/{id}` 라우트를 신설하고,
친구 여부에 따라 `FriendProfile` / `PublicProfile`을 분기 렌더링한다.

---

## 작업 범위 및 변경 파일

| # | 파일 | 변경 내용 |
|---|---|---|
| 1 | `src/app/actions/social.ts` | `getSocialProfileAction(userId)` 추가 |
| 2 | `src/app/users/[userId]/page.tsx` | **신규** — `/users/{id}` Server Component 라우트 |
| 3 | `src/components/UserProfile/PublicProfile.tsx` | **신규** — 비친구 공개 프로필 컴포넌트 |
| 4 | `src/components/FriendProfile/FriendProfile.tsx` | props 재설계, 연결 경로 lazy 버튼 추가 |
| 5 | `src/app/friends/[friendId]/page.tsx` | `/users/{friendId}` redirect로 교체 |
| 6 | `src/components/FriendRequest/FriendRequestPage.tsx` | found → `router.push("/users/{id}")` 이동 |
| 7 | `src/components/FriendActionPanel/FriendActionPanel.tsx` | "프로필 보기" 링크 경로 변경 |
| 8 | `src/app/buzzes/new/page.tsx` | `searchParams.to` → `BuzzForm` 초기 수신자 세팅 |
| 9 | `src/components/Buzz/BuzzForm.tsx` | `initialMemberId?: number` prop 추가 |

---

## 상세 구현 계획

### 1. `getSocialProfileAction` 추가 — `src/app/actions/social.ts`

```ts
export async function getSocialProfileAction(userId: number) {
  try {
    const data = await apiClient.get<SocialProfileResult>(`/api/v1/social/users/${userId}`);
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const };
  }
}
```

import 추가: `SocialProfileResult` from `@/api/model/socialProfileResult`

---

### 2. `/users/{id}` 라우트 신설 — `src/app/users/[userId]/page.tsx`

```
(Server Component)
1. params에서 userId 파싱, NaN이면 redirect("/")
2. getFriendProfileAction(userId)
   - 성공 → <FriendProfile profile={data} userId={userId} />
   - 실패 → getSocialProfileAction(userId)
     - 성공 → <PublicProfile profile={data} userId={userId} />
     - 실패 → redirect("/")
```

현재 `friends/[friendId]/page.tsx`가 서버에서 `recordTraceAction`, `getConnectionPathAction`을 선제 호출하고 있다.
신규 라우트에서는 **두 액션 모두 서버에서 호출하지 않는다** — 클라이언트 컴포넌트 내부 `useEffect`로 이동.

---

### 3. `PublicProfile.tsx` 신규 — `src/components/UserProfile/PublicProfile.tsx`

Props: `profile: SocialProfileResult`, `userId: number`

State:
- `revealed: boolean` — `recordTraceAction` 결과
- `requestStatus: "idle" | "loading" | "sent" | "error"` — 친구 요청 상태

UI:
- 프로필 이미지 (없으면 letter avatar)
- `profile.nickname`
- trace 카드: `revealed === true`이면 👀 "최근 서로 자주 방문했습니다"
- `[친구 요청 보내기]` → `sendFriendRequestAction(userId)` → 완료 시 버튼 비활성화 + 문구
- `[Buzz 보내기]` → `router.push("/buzzes/new?to=${userId}")`

`useEffect`:
```ts
useEffect(() => {
  recordTraceAction(userId).then(r => {
    if (r?.data?.revealed) setRevealed(true);
  });
}, [userId]);
```

---

### 4. `FriendProfile.tsx` 수정 — `src/components/FriendProfile/FriendProfile.tsx`

**변경 전 Props**: `profile`, `path: ConnectionPathResult | null`, `revealed?: boolean`
**변경 후 Props**: `profile`, `userId: number`

변경 내용:
- `revealed` prop 제거 → 내부 `useState(false)` + `useEffect`에서 `recordTraceAction(userId)`
- `path` prop 제거 → "관련도 높은 친구 찾기" 버튼 클릭 시 `getConnectionPathAction(userId)` lazy fetch
- 연결 경로 UI:
  ```
  [관련도 높은 친구 찾기]   ← 클릭 전
       ↓ 클릭 (로딩)
  intermediaries 없음:  "공통 연결 고리를 찾을 수 없습니다."
  intermediaries[0] 있음: "OO님을 통한 연결이 자연스러워 보입니다."
  ```
  score 수치 노출 없음.

추가 state: `pathStatus: "idle" | "loading" | "done"`, `connectionLabel: string | null`

---

### 5. `friends/[friendId]/page.tsx` — redirect로 교체

기존 코드 전체 교체:
```ts
import { redirect } from "next/navigation";
export default async function FriendProfilePage({ params }) {
  const { friendId } = await params;
  redirect(`/users/${friendId}`);
}
```

---

### 6. `FriendRequestPage.tsx` — found 시 페이지 이동

`searchStatus === "found"` 인라인 카드 렌더링 블록 제거.
`useEffect` 추가:
```ts
useEffect(() => {
  if (searchStatus === "found" && searchResult?.id) {
    router.push(`/users/${searchResult.id}`);
  }
}, [searchStatus, searchResult, router]);
```

---

### 7. `FriendActionPanel.tsx` — "프로필 보기" 링크 경로 변경

```tsx
// 변경 전
href={`/friends/${friend.friendId}`}
// 변경 후
href={`/users/${friend.friendId}`}
```

---

### 8 & 9. `buzzes/new/page.tsx` + `BuzzForm.tsx` — 초기 수신자 세팅

`buzzes/new/page.tsx`:
```ts
export default async function BuzzNewPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const { to } = await searchParams;
  const initialMemberId = to ? Number(to) : undefined;
  // ... 기존 friends, labels fetch ...
  return <BuzzForm friends={friends} labels={labels} initialMemberId={initialMemberId} />;
}
```

`BuzzForm.tsx`:
- `initialMemberId?: number` prop 추가
- `selectedMemberIds` 초기값: `initialMemberId ? [initialMemberId] : []`
- `recipientType` 초기값: MANUAL 유지 (기존과 동일)

---

## 테스트 시나리오

### Phase 1 — 정적 검증
- `npx tsc --noEmit` 에러 없음
- `npm run lint` 에러 없음

### Phase 2 — UI/State 검증
- 친구 찾기 이메일 검색 → 유저 found → `/users/{id}` 자동 이동
- 비친구 유저 프로필: 닉네임 + 프로필 이미지 표시
- trace 카드: 페이지 로드 후 `recordTraceAction` 응답으로 `revealed=true`이면 출현
- `[친구 요청 보내기]` → "친구 요청을 보냈습니다." + 버튼 비활성화
- `[Buzz 보내기]` → `/buzzes/new?to={userId}`, BuzzForm에서 해당 유저 수신자 선택 상태
- 친구 유저 URL `/users/{friendId}` 직접 접근 → FriendProfile UI 표시
- FriendProfile — "관련도 높은 친구 찾기" 클릭 → 로딩 후 텍스트 카드 표시
- 그래프 노드 → "프로필 보기" → `/users/{id}` 이동
- `/friends/{id}` 직접 접근 → `/users/{id}` redirect

### Phase 3 — Edge Case
- 존재하지 않는 userId → `redirect("/")`
- `recordTraceAction` 실패해도 프로필 페이지 정상 표시 (trace 카드만 안 뜸)
- 이미 친구 요청을 보낸 유저 → 백엔드 에러 응답 기반으로 버튼 상태 처리
