# Task 17: Buzz 소유권 필드 백엔드 위임

## 배경

Task 14 작업 중 `buzzes/[buzzId]/page.tsx`가 `GET /api/v1/accounts/me`(존재하지 않던 엔드포인트)를 호출하던 버그를 수정했다.
현재는 `GET /api/v1/users/me`로 교체해 `myUserId`를 가져온 뒤 클라이언트에서 직접 비교하는 방식으로 임시 처리 중이다.

`FlagDetailResult.isHost`를 백엔드가 직접 판단해 내려주는 것과 동일하게,
Buzz도 소유권 판단을 백엔드에 위임하면 `/me` 호출을 제거할 수 있다.

## 현재 방식 (임시)

```
page.tsx → GET /api/v1/users/me → myUserId
         → GET /api/v1/buzzes/{buzzId} → BuzzDetailResult
         → myUserId === buzz.author.userId  → isMyBuzz (삭제 버튼)
         → myUserId === comment.author.userId → isMine (댓글 수정/삭제)
```

## 목표 방식

백엔드가 `BuzzDetailResult`와 `BuzzCommentResult`에 소유권 필드를 추가한다.

```ts
BuzzDetailResult {
  ...
  isMyBuzz?: boolean;   // 요청자가 Buzz 작성자인지
}

BuzzCommentResult {
  ...
  isMine?: boolean;     // 요청자가 댓글 작성자인지
}
```

프론트는 `/api/v1/users/me` 호출 없이 `buzz.isMyBuzz`, `comment.isMine`만 참조.

## 작업 범위

1. 백엔드 필드 추가 후 Orval 재생성
2. `buzzes/[buzzId]/page.tsx` — `GET /api/v1/users/me` 호출 제거, `myUserId` prop 제거
3. `BuzzDetail.tsx` — `myUserId` 비교 로직을 `isMyBuzz` / `isMine` 참조로 교체

## 검증

- Buzz 상세 진입 시 내 Buzz → [삭제] 버튼 표시
- 내 댓글 → [수정][삭제] 버튼 표시
- 타인 Buzz → 삭제 버튼 미표시
- `npx tsc --noEmit` 에러 없음

## Result

### Phase 1 ✅
- `npx tsc --noEmit` 에러 없음

### 변경 내용
- `buzzes/[buzzId]/page.tsx`: `GET /api/v1/users/me` 호출 제거, `myUserId` prop 제거
- `BuzzDetail.tsx`: `myUserId` 비교 → `buzz.isCreator` / `c.isMine` 참조로 교체
- Orval 재생성: `BuzzDetailResult.isCreator`, `BuzzCommentResult.isMine` 반영

### 필드명 참고
태스크 문서의 `isMyBuzz` 대신 백엔드가 `isCreator`로 추가함.
