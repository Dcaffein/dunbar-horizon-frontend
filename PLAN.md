# PLAN — Task 07: 친구 요청 플로우

> 참조 태스크: `harness/tasks/07-friend-request-flow.md`
> 작업 브랜치: `agent/task-07-friend-request-flow`

## 요구사항 분석

- `/requests` 전용 페이지 (탭 3개: 받은 요청 · 보낸 요청 · 친구 찾기)
- 이미 친구 방어: 백엔드 에러 메시지 노출
- 이미 요청 보낸 유저: 프론트에서 `sentRequests` 비교해 버튼 비활성
- 수락 후 그래프 반영: `/`로 이동 시 서버 컴포넌트 자연 재실행

---

## 생성 / 수정 파일

| 파일 | 신규/수정 | 내용 |
|---|---|---|
| `src/app/actions/friendRequest.ts` | 신규 | Server Actions 7개 |
| `src/app/requests/page.tsx` | 신규 | Server Component — 초기 데이터 조회 후 전달 |
| `src/components/FriendRequest/FriendRequestPage.tsx` | 신규 | Client Component — 탭 UI |
| `src/components/FriendRequest/useFriendRequest.ts` | 신규 | 비즈니스 로직 훅 |
| `src/app/page.tsx` | 수정 | 헤더에 "/requests" 이동 버튼 추가 |

---

## 상세 설계

### `src/app/actions/friendRequest.ts`

```ts
"use server"

searchUserByEmailAction(email: string)
  → GET /api/v1/users/search?email=
  → { success, data: UserProfileInfo } | { success: false, message }

sendFriendRequestAction(receiverId: number)
  → POST /api/v1/friend-requests { receiverId }
  → { success, data: FriendRequestResult } | { success: false, message }

getReceivedRequestsAction()
  → GET /api/v1/friend-requests
  → { success, data: FriendRequestResult[] }

getSentRequestsAction()
  → GET /api/v1/friend-requests/sent
  → { success, data: FriendRequestResult[] }

acceptFriendRequestAction(requestId: string)
  → POST /api/v1/friend-requests/{id}/accept
  → { success } | { success: false, message }

hideFriendRequestAction(requestId: string)
  → POST /api/v1/friend-requests/{id}/hide
  → { success } | { success: false, message }

cancelFriendRequestAction(requestId: string)
  → DELETE /api/v1/friend-requests/{id}
  → { success } | { success: false, message }
```

### `src/app/requests/page.tsx`

서버 컴포넌트. 받은 요청 + 보낸 요청을 병렬 조회 후 `FriendRequestPage`에 전달.

```tsx
const [received, sent] = await Promise.all([
  getReceivedRequestsAction(),
  getSentRequestsAction(),
])
```

### `src/components/FriendRequest/FriendRequestPage.tsx`

탭 구조:

```
[받은 요청 N]  [보낸 요청 N]  [친구 찾기]
```

**받은 요청 탭**: PENDING 요청 카드 목록. 각 카드 — 요청자 닉네임 + [수락] [숨기기] 버튼. 수락/숨기기 200 OK → 로컬 state에서 제거.

**보낸 요청 탭**: 보낸 요청 카드 목록. 각 카드 — 수신자 닉네임 + [취소] 버튼. 취소 200 OK → 로컬 state에서 제거.

**친구 찾기 탭**:
- 이메일 입력 + [검색] 버튼
- 검색 결과: 유저 카드 (닉네임 + 프로필 이미지) + [요청 보내기] 버튼
- 이미 보낸 요청: `sentRequests`에 해당 id 존재 → 버튼 비활성 + "이미 요청을 보냈습니다"
- 이미 친구 / 기타 오류: 백엔드 에러 메시지 표시
- 요청 전송 성공 → `sentRequests`에 추가 + 버튼 비활성화

### `src/app/page.tsx`

헤더 우측에 `LogoutButton` 옆 "친구 요청" 버튼(`<Link href="/requests">`) 추가.

---

## 테스트 시나리오 (harness/TESTING_RULES.md Phase 기준)

### Phase 1 — 정적 분석
- `npx tsc --noEmit` 에러 없음

### Phase 2 — UI/State (Playwright headless)
- `/requests` 페이지 접근 → 탭 3개 렌더링 확인
- 존재하지 않는 이메일 검색 → 안내 메시지 표시
- 받은 요청 탭 → 카드 목록 렌더링
- 보낸 요청 탭 → 카드 목록 렌더링

### Phase 3 — 실제 API
- 실존 이메일 검색 → 유저 카드 노출
- 친구 요청 전송 → sentRequests에 추가 + 버튼 비활성
- 중복 요청 시도 → "이미 요청을 보냈습니다" 표시
- 받은 요청 수락 → 목록에서 제거 + `/` 이동 시 새 친구 그래프 반영
- 받은 요청 숨기기 → 목록에서 제거
- 보낸 요청 취소 → 목록에서 제거
