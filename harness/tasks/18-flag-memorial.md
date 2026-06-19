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

### Phase 1 ✅
- `npx tsc --noEmit` 에러 없음
- `npm run lint` 에러 없음

### Phase 2 ✅ PASS
- Flag 상세 하단 Memorial 섹션("기억 남기기") 표시 확인
- Host(참가자) → 입력 textarea + [기억 남기기] 버튼 표시
- Memorial 작성 → 백엔드 저장 확인
- 내 Memorial [수정][삭제] 버튼 표시 + 수정·삭제 백엔드 반영 확인
- 🔍 빈 내용 → [기억 남기기] 버튼 비활성화
- 🔍 비참가자 → 입력창 미표시, 목록 섹션은 표시
- 🔍 Memorial 없는 초기 상태 → "아직 남겨진 기억이 없습니다." 표시

### 참고
- Memorial은 `ENDED` 상태 Flag에만 작성 가능 (백엔드 정책)
- `myUserId`는 `FlagDetail` 기존 props 재사용 — 추가 API 호출 없음
- 소유권 판단: `memorial.writerId === myUserId` 클라이언트 비교
