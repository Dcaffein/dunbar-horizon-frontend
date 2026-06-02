# Task 19: Flag 댓글

## 배경

Flag 상세 페이지에서 참가자들이 소통하는 댓글 기능.
루트 댓글과 대댓글(reply) 구조를 가지며, 비공개 댓글(`isPrivate`) 옵션이 있다.

## 사용 API

| 액션 | API |
|---|---|
| 댓글 목록 조회 | `GET /api/v1/flags/{flagId}/comments` → `CommentResult[]` |
| 댓글 수 조회 | `GET /api/v1/flags/{flagId}/comments/count` → `number` |
| 루트 댓글 작성 | `POST /api/v1/flags/{flagId}/comments` `{ content, isPrivate? }` |
| 대댓글 작성 | `POST /api/v1/comments/{parentId}/replies` `{ content, isPrivate? }` |
| 댓글 수정 | `PATCH /api/v1/comments/{commentId}` `{ content }` |
| 댓글 삭제 | `DELETE /api/v1/comments/{commentId}` |

```ts
CommentResult {
  id?: number;
  writerInfo?: WriterInfo;   // { userId, nickname, profileImageUrl }
  content?: string;
  isPrivate?: boolean;       // true면 host + 작성자만 열람
  createdAt?: string;
  // 대댓글 구조: replies[]? — 백엔드 응답 형태 PLAN 단계에서 확인
}
```

## UI 구조

`/flags/{id}` 상세 페이지에 댓글 섹션 추가.

```
댓글 12개
┌──────────────────────────────────┐
│  박민준: "언제 또 해요?"           │
│  └─ 이영희: "다음달에!"  [대댓글]  │
│  🔒 김철수: (비공개 댓글)          │  ← host·작성자만 표시
├──────────────────────────────────┤
│  [댓글 입력]  [🔒 비공개]  [전송]  │
└──────────────────────────────────┘
```

- 비공개 댓글: host와 작성자만 내용 열람, 다른 참가자에게는 "(비공개 댓글)" 표시
- 내 댓글만 수정·삭제 가능
- 대댓글은 1단계까지만 (대댓글의 대댓글 없음)

## 상태 동기화

- 목록: 서버 컴포넌트 초기 로드
- 작성·수정·삭제: 200 OK → `router.refresh()`

## 스코프 외

- 댓글 좋아요
- 댓글 이미지 첨부

## 검증

- Flag 상세에 댓글 목록 표시
- 댓글 작성 → 목록 반영
- 비공개 댓글 → 권한 없는 유저에게 내용 숨김
- 대댓글 작성 → 들여쓰기로 표시
- 내 댓글만 수정·삭제 버튼 표시
- `npx tsc --noEmit` 에러 없음

## Result

### Phase 1 ✅
- `npx tsc --noEmit` 에러 없음
- `npm run lint` 에러 없음

### Phase 2 ✅ PASS
- Flag 상세 댓글 섹션 표시, 입력창 표시
- 루트 댓글 작성 → 백엔드 저장 확인
- 내 댓글 [수정][삭제] 버튼 표시 + 수정 백엔드 반영
- 대댓글 작성 → replies에 저장, 들여쓰기 표시
- 비공개 댓글 → 작성자에게 내용 표시, 타인 참가자에게 안 보임
- 🔍 빈 내용 → [전송] 버튼 비활성화
- 🔍 대댓글에 [답글] 미표시 (1단계만)

### 설계 결정

**`CommentResult.replies` 타입 누락 (순환참조)**
`GET /api/v1/flags/{flagId}/comments`가 트리 구조(`replies` 포함)로 응답하지만,
OpenAPI 스펙이 순환참조로 `replies` 필드를 누락함 → Orval 미생성.
`FlagComments.tsx` 내부에서 `type CommentTree = CommentResult & { replies?: CommentTree[] }` 확장 타입을 정의하고
`initialComments as CommentTree[]`로 1회 cast해서 처리.

**비공개 댓글 렌더링**
태스크 원안("다른 참가자에게 `(비공개 댓글)` 표시")과 달리, 백엔드가 비공개 댓글을
비작성자/비host에게 응답에서 완전히 제외함. 프론트는 `canView` 로직 없이 `comment.content` 그대로 표시.
결과적으로 🔒 아이콘만 남겨 작성자가 비공개 여부를 인지하도록 함.
