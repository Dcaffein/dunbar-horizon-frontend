# PLAN — Task 10: Buzz

> 참조 태스크: `harness/tasks/10-buzz.md`
> 작업 브랜치: `agent/task-10-buzz`

## 요구사항 분석

- 그래프에서 미읽음 Buzz 발신자 노드 하이라이트
- `/buzzes` 받은 Buzz 목록 (페이지네이션)
- `/buzzes/{buzzId}` Buzz 상세 + 댓글 CRUD
- `/buzzes/new` Buzz 작성 (ANCHOR / LABEL / MANUAL + 이미지 업로드)
- 이미지: presign Server Action → 클라이언트 S3 PUT → imageKeys 포함

---

## 생성 / 수정 파일

| 파일 | 신규/수정 | 내용 |
|---|---|---|
| `src/app/actions/buzz.ts` | 신규 | Server Actions (buzz + label 목록) |
| `src/app/page.tsx` | 수정 | `getUnreadSenders()` 병렬 조회 + SocialGraph prop |
| `src/components/socialGraph/index.tsx` | 수정 | `unreadBuzzSenderIds` prop + 노드 클릭 "Buzz 확인" 버튼 |
| `src/components/socialGraph/styles.ts` | 수정 | `node.buzz-unread` 스타일 추가 |
| `src/components/socialGraph/useGraphData.ts` | 수정 | `unreadBuzzSenderIds` → 노드 클래스 적용 |
| `src/app/buzzes/page.tsx` | 신규 | Server Component — 목록 초기 조회 |
| `src/components/Buzz/BuzzList.tsx` | 신규 | 받은 Buzz 카드 목록 + 더 보기 |
| `src/app/buzzes/[buzzId]/page.tsx` | 신규 | Server Component — 상세 조회 |
| `src/components/Buzz/BuzzDetail.tsx` | 신규 | 상세 + 댓글 CRUD |
| `src/app/buzzes/new/page.tsx` | 신규 | 작성 페이지 (Server Component 껍데기) |
| `src/components/Buzz/BuzzForm.tsx` | 신규 | 작성 폼 (recipient 선택 + 이미지 업로드) |

---

## 상세 설계

### `src/app/actions/buzz.ts`

```ts
"use server"

getUnreadSendersAction()       → GET /api/v1/buzzes/senders/unread → number[]
getReceivedBuzzesAction(page)  → GET /api/v1/buzzes/?page=&size=20 → SliceBuzzSummaryResult
getBuzzDetailAction(buzzId)    → GET /api/v1/buzzes/{buzzId}       → BuzzDetailResult
createBuzzAction(body)         → POST /api/v1/buzzes                → BuzzDetailResult
deleteBuzzAction(buzzId)       → DELETE /api/v1/buzzes/{buzzId}
addCommentAction(buzzId, body) → POST /api/v1/buzzes/{buzzId}/comments → BuzzCommentResult
updateCommentAction(buzzId, commentId, body) → PATCH → BuzzCommentResult
deleteCommentAction(buzzId, commentId)       → DELETE
presignImagesAction(reqs)      → POST /api/v1/buzzes/images/presign → PresignedUploadResult[]
getLabelsAction()              → GET /api/v1/labels                 → LabelResult[]
```

### `src/app/page.tsx` 수정

```ts
const [friends, unreadCount, unreadSenders] = await Promise.all([
  apiClient.get('/api/v1/friends'),
  getUnreadCountAction(),
  getUnreadSendersAction(),
]);
```

`SocialGraph`에 `unreadBuzzSenderIds={unreadSenders.data ?? []}` prop 추가.
헤더에 Buzz 목록 링크(`/buzzes`) 추가.

### 그래프 하이라이트

`useGraphData`: `unreadBuzzSenderIds` set에 포함된 친구 노드에 `classes: "buzz-unread"` 추가.

`styles.ts`: 
```ts
{ selector: 'node.buzz-unread',
  style: { 'border-color': '#f97316', 'border-width': 3, 'background-color': '#fff7ed' } }
```

`index.tsx`: `FriendActionPanel`에 `isBuzzUnread` prop 추가. 패널 하단에 "Buzz 확인" 버튼 → `/buzzes?from={friendId}` 이동.

### `/buzzes` — BuzzList

카드 구조:
- 미읽음(`isUnread`): 주황색 좌측 인디케이터 + 밝은 배경
- `author.nickname`, `text`(truncate), `commentCount`, `remainingMinutes`
- 10분 미만 시 `remainingMinutes` 빨간 강조
- 카드 클릭 → `/buzzes/{buzzId}`
- "더 보기" — slice 기반

### `/buzzes/{buzzId}` — BuzzDetail

- 서버 컴포넌트에서 `getBuzzDetailAction` → 자동 읽음 처리
- 댓글 목록 표시, 내 댓글(`author.userId === myId`) → 수정/삭제 버튼
- 댓글 입력창: text + `isPublic` 체크박스
- 이미지 첨부(presign → S3 PUT → imageKeys)

### `/buzzes/new` — BuzzForm

수신자 타입 탭:
- **ANCHOR**: 친구 드롭다운 + expansionValue 슬라이더 (0~1, Low/Mid/High 라벨)
- **LABEL**: 내 라벨 목록 체크박스
- **MANUAL**: 친구 목록 체크박스

텍스트 입력 + 이미지 첨부(presign → S3 PUT) → 전송 → `/buzzes` 이동.

### 이미지 업로드 유틸 (`src/lib/uploadImages.ts`)

```ts
async function uploadImages(files: File[]): Promise<string[]>
  1. presignImagesAction(files.map(f => ({contentType: f.type, size: f.size})))
  2. files.forEach(f => fetch(uploadUrl, {method:'PUT', body: f}))
  3. return objectKeys
```

---

## 테스트 시나리오

### Phase 1 — 정적 분석
- `npx tsc --noEmit` 에러 없음

### Phase 2 — UI/State ✅ PASS
- `/buzzes` 진입 → 빈 상태("받은 Buzz가 없습니다.") + "+ 작성" 버튼 렌더링 확인
- `/buzzes/new` 진입 → "Buzz 작성" 헤더 + 수신자 탭 3개(Anchor/라벨/직접 선택) 확인
- ANCHOR 탭(기본값) → 친구 드롭다운 + 좁게/보통/넓게 버튼 노출 확인
- 빈 폼 전송 → "내용을 입력해주세요." 클라이언트 검증 즉시 표시 확인
- 그래프(`/`) → 헤더에 Buzz 링크 노출 확인

### Phase 3 — Edge Cases ✅ PASS
- LABEL 탭 선택 없이 전송 → "라벨을 하나 이상 선택해주세요." 에러 즉시 표시
- MANUAL 탭 선택 없이 전송 → "수신자를 한 명 이상 선택해주세요." 에러 즉시 표시
- 잘못된 buzzId(`/buzzes/nonexistent`) 접근 → `/buzzes`로 리다이렉트 확인
- ANCHOR 탭 빈 내용 전송 → "내용을 입력해주세요." 에러 확인
- LABEL 탭 라벨 없는 유저 → "라벨이 없습니다." 빈 상태 표시
