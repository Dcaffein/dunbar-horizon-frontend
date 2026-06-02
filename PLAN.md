# PLAN: Task 19 — Flag 댓글

> 참조 태스크: `harness/tasks/19-flag-comments.md`

## 선행 확인 결과

| 항목 | 상태 |
|---|---|
| `CommentResult.isMine` | ✅ Orval 반영 완료 — 소유권 백엔드 위임 |
| `CommentResult.replies` | ❌ 스펙 순환참조 누락 — 확장 타입으로 처리 |
| API 6개 | ✅ `flag-comment-controller.ts` 생성 완료 |
| `myUserId` | ✅ `flags/[id]/page.tsx`에서 이미 조회 + FlagDetail props 전달 중 |

## replies 처리

`CommentResult`는 Orval 생성 파일이므로 직접 수정하지 않는다.
`FlagComments.tsx` 내부에서 확장 타입을 정의해 사용한다:

```ts
type CommentTree = CommentResult & { replies?: CommentTree[] };
```

## 작업 범위

### 수정 파일

1. **`src/app/actions/flag.ts`**
   - `getCommentsAction(flagId)` — `GET /api/v1/flags/{flagId}/comments`
   - `createCommentAction(flagId, content, isPrivate?)` — `POST /api/v1/flags/{flagId}/comments`
   - `createReplyAction(parentId, content, isPrivate?)` — `POST /api/v1/comments/{parentId}/replies`
   - `updateCommentAction(commentId, content)` — `PATCH /api/v1/comments/{commentId}`
   - `deleteCommentAction(commentId)` — `DELETE /api/v1/comments/{commentId}`

2. **`src/app/flags/[id]/page.tsx`**
   - `getCommentsAction(id)` 추가 호출
   - `comments: CommentResult[]` FlagDetail에 전달

3. **`src/components/Flag/FlagDetail.tsx`**
   - `comments` prop 추가
   - Memorial 섹션 위에 `FlagComments` 렌더링

### 신규 파일

4. **`src/components/Flag/FlagComments.tsx`** (Client Component)
   - props: `flagId`, `initialComments`, `myUserId`, `isHost`
   - `type CommentTree = CommentResult & { replies?: CommentTree[] }` 로컬 정의
   - 상태: `comments`, 입력 `text`+`isPrivate`, `replyingToId`, `editingId`+`editText`

## UI 상태 정의

```
commentTree[]
├─ 루트 댓글 (id, writerInfo, content, isPrivate, createdAt, isMine)
│   └─ replies[]
│       └─ 대댓글 (동일 구조, isMine)
│
입력창: text | [🔒 비공개] toggle | [전송]
대댓글 입력: 루트 댓글 [답글] 클릭 시 인라인 표시
```

## 비공개 댓글 렌더링 규칙

```
isPrivate === true AND !(isMine || isHost)
  → content 대신 "(비공개 댓글)" 표시
```

## 소유권 판단

`comment.isMine` 직접 사용 — `myUserId` 비교 불필요.  
단, 비공개 열람 권한 판단(`isHost`)은 FlagDetail에서 전달받는다.

## 상태 동기화

- 작성·수정·삭제 성공 → `router.refresh()` (서버 컴포넌트 재실행으로 최신 목록 반영)

## 테스트 시나리오

### Phase 1 — 정적 분석
- `npx tsc --noEmit` 에러 없음
- `npm run lint` 에러 없음

### Phase 2 — UI/State 검증
- Flag 상세에 댓글 섹션 표시
- 루트 댓글 작성 → 목록 반영
- 대댓글 작성 → 들여쓰기로 표시
- 내 댓글 [수정][삭제] 버튼 표시 → 동작 확인
- 비공개 댓글 → 권한 없는 유저에게 "(비공개 댓글)" 표시

### Phase 3 — Edge Case
- 빈 내용 제출 → 버튼 비활성화
- 대댓글에는 [답글] 버튼 미표시 (1단계만)
