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

<!-- 작업 완료 후 기록 -->
