# Task 18: Flag Memorial

## 배경

Flag 종료 후 참가자들이 함께한 기억을 남기는 기록 공간.
`MemorialResult`에는 작성자 정보와 텍스트 콘텐츠가 포함된다.

## 사용 API

| 액션 | API |
|---|---|
| Memorial 목록 조회 | `GET /api/v1/flags/{flagId}/memorials` → `MemorialResult[]` |
| Memorial 작성 | `POST /api/v1/flags/{flagId}/memorials` `{ content }` |
| Memorial 수정 | `PATCH /api/v1/flags/memorials/{id}` `{ content }` |
| Memorial 삭제 | `DELETE /api/v1/flags/memorials/{id}` |

```ts
MemorialResult {
  id?: number;
  writerId?: number;
  nickname?: string;
  profileImageUrl?: string;
  content?: string;        // 최대 1000자
  createdAt?: string;
}
```

## UI 구조

`/flags/{id}` 상세 페이지 하단에 Memorial 섹션 추가.

```
/flags/{id}
┌──────────────────────────────────┐
│  (Flag 기본 정보 + 참가자)         │
│  ──────────────────────────────  │
│  기억 남기기                      │
│  ┌──────────────────────────┐   │
│  │ 박민준: "정말 즐거웠어요!" │   │
│  │ 어제                      │   │
│  └──────────────────────────┘   │
│  [내 기억 남기기 +]               │
└──────────────────────────────────┘
```

- 참가자 전원 조회 가능
- 작성은 참가자만 가능 (host 포함)
- 내 Memorial만 수정·삭제 가능 (`writerId === myUserId`)
- `myUserId`는 `FlagDetailResult.isHost` 패턴처럼 백엔드가 `isMyMemorial` 제공하거나 `/api/v1/users/me` 활용

## 상태 동기화

- 목록: 서버 컴포넌트 초기 로드
- 작성·수정·삭제: 200 OK → `router.refresh()`

## 스코프 외

- Memorial 이미지 첨부
- Memorial 좋아요

## 검증

- Flag 상세에 Memorial 섹션 표시
- Memorial 작성 → 목록 반영
- 내 Memorial 수정·삭제 가능
- 타인 Memorial 수정·삭제 버튼 미표시
- `npx tsc --noEmit` 에러 없음

## Result

<!-- 작업 완료 후 기록 -->
