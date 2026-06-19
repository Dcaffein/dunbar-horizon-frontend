# Task 10: Buzz

## 배경

Buzz는 지정한 수신자들에게만 보이는 시한부 콘텐츠다.
수신자 지정 방식이 Dunbar Horizon의 네트워크 철학과 연결된다 — anchor 기반으로 "내 친구의 친구이면서 동시에 내 친구"인 사람들에게만 Buzz를 보낼 수 있다.

## 용어

- **Buzz**: 지정된 수신자들에게만 노출되는 시한부 게시물. `remainingMinutes`가 0이 되면 만료.
- **수신자 지정 방식**: ANCHOR / LABEL / MANUAL 세 가지
- **expansionValue (0~1)**: ANCHOR 방식에서 백엔드가 수신자 범위를 결정하는 값

## 사용 API

| 액션 | API |
|---|---|
| 미읽음 발신자 조회 | `GET /api/v1/buzzes/senders/unread` → `number[]` (userId) |
| 받은 Buzz 목록 | `GET /api/v1/buzzes/?pageable=` → `SliceBuzzSummaryResult` |
| Buzz 상세 | `GET /api/v1/buzzes/{buzzId}` → `BuzzDetailResult` |
| Buzz 작성 | `POST /api/v1/buzzes` `BuzzCreateRequest` |
| Buzz 삭제 | `DELETE /api/v1/buzzes/{buzzId}` |
| 댓글 작성 | `POST /api/v1/buzzes/{buzzId}/comments` |
| 댓글 수정 | `PATCH /api/v1/buzzes/{buzzId}/comments/{commentId}` |
| 댓글 삭제 | `DELETE /api/v1/buzzes/{buzzId}/comments/{commentId}` |
| 이미지 presign | `POST /api/v1/buzzes/images/presign` → `PresignedUploadResult[]` |

```ts
BuzzCreateRequest {
  text: string;
  recipient: AnchorRecipientRequest | LabelRecipientRequest | ManualRecipientRequest;
  imageKeys?: string[];
}

// 수신자 방식별 타입
AnchorRecipientRequest { type: "ANCHOR"; anchorFriendId: number; expansionValue: number; }
LabelRecipientRequest  { type: "LABEL";  labelIds: string[]; }
ManualRecipientRequest { type: "MANUAL"; memberIds: number[]; }

BuzzSummaryResult {
  buzzId?: string;
  author?: BuzzProfileResult;   // { userId, nickname, profileImageUrl }
  text?: string;
  imageUrls?: string[];
  commentCount?: number;
  remainingMinutes?: number;
  isUnread?: boolean;
}

BuzzDetailResult {
  buzzId?: string;
  author?: BuzzProfileResult;
  text?: string;
  imageUrls?: string[];
  comments?: BuzzCommentResult[];
  remainingMinutes?: number;
  isUnread?: boolean;
}
```

## UI 구조

### 1. 그래프 — 미읽음 Buzz 하이라이트

`app/page.tsx`에서 기존 `getFriends()`, `getUnreadCount()`와 함께 `getUnreadSenders()`를 병렬 조회.

```ts
const [friends, unreadCount, unreadSenders] = await Promise.all([
  getFriends(),
  getUnreadCount(),
  getUnreadSenders(),
]);
```

`unreadBuzzSenderIds: number[]`를 `SocialGraph` prop으로 전달.
해당 친구 노드에 별도 시각 스타일 적용 (예: 강조 테두리, 다른 색상).

하이라이트 노드 클릭 → `FriendActionPanel`에 "Buzz 확인" 버튼 노출 → `/buzzes/{buzzId}` 이동.

### 2. 받은 Buzz 목록 — `/buzzes`

헤더에 Buzz 목록 링크 추가. 서버 컴포넌트가 초기 목록 조회.

```
/buzzes
┌──────────────────────────────────┐
│  받은 Buzz                  [작성] │
├──────────────────────────────────┤
│  🔴 박민준  "주말에 같이 뭐해?"     │  ← isUnread
│     이미지 1장 · 댓글 2 · 23분 남음 │
├──────────────────────────────────┤
│     김철수  "공유할게"             │  ← 읽음
│     37분 남음                      │
└──────────────────────────────────┘
```

- 미읽음 Buzz 상단 정렬 또는 강조
- `remainingMinutes` 표시 (만료 임박 시 강조)
- 더 보기(페이지네이션)

### 3. Buzz 상세 — `/buzzes/{buzzId}`

`getBuzzDetail` 호출 시 백엔드에서 자동 읽음 처리.

```
/buzzes/{buzzId}
┌──────────────────────────────────┐
│  ← 박민준                23분 남음 │
│  ──────────────────────────────  │
│  "주말에 같이 뭐해?"               │
│  [이미지]                         │
│  ──────────────────────────────  │
│  댓글 2개                         │
│  이영희: "나도 끼워줘"  [수정][삭제] │
│  ──────────────────────────────  │
│  [댓글 입력창]  [이미지]  [전송]    │
└──────────────────────────────────┘
```

- 댓글 `isPublic` 옵션: 공개(모든 수신자 열람) / 비공개(발신자만 열람)
- 내 댓글만 수정/삭제 가능

### 4. Buzz 작성 — `/buzzes/new`

```
/buzzes/new
┌──────────────────────────────────┐
│  수신자 지정                       │
│  ○ Anchor  ○ 라벨  ○ 직접 선택    │
│                                   │
│  [anchor 선택 시: 친구 드롭다운     │
│   + expansionValue 슬라이더(L/M/H)]│
│                                   │
│  내용 입력                         │
│  [텍스트 영역]                     │
│  [이미지 첨부]  [전송]              │
└──────────────────────────────────┘
```

**`expansionValue` UI**: 0~1 범위 슬라이더. 값이 클수록 더 넓은 범위의 수신자에게 전달.

## 이미지 업로드 플로우

클라이언트에서만 처리 (Server Action 불가 — S3 직접 업로드 필요).

```
1. presignImages([{ contentType, size }]) → [{ uploadUrl, objectKey }]
2. 클라이언트에서 uploadUrl로 PUT 업로드
3. objectKey[]를 BuzzCreateRequest.imageKeys에 포함
```

## 상태 동기화

- 그래프 하이라이트: 서버 컴포넌트 재진입 시 자동 갱신
- Buzz 목록: 서버 컴포넌트 초기 로드 + "더 보기" 클라이언트 추가 조회
- 댓글 작성/수정/삭제: 200 OK 후 로컬 state 업데이트
- Buzz 작성 후: `/buzzes`로 이동 (서버 컴포넌트 재실행으로 목록 갱신)

## 스코프 외

- Buzz 수정 — 백엔드 API 없음
- 만료된 Buzz 아카이브 조회 — 백엔드 API 없음
- Buzz 발신 목록 (내가 보낸 Buzz) — 백엔드 API 없음

## 검증

- 그래프 진입 시 미읽음 Buzz 발신자 노드 하이라이트
- 하이라이트 노드 클릭 → FriendActionPanel에 "Buzz 확인" 버튼
- `/buzzes` 진입 시 받은 Buzz 목록 렌더링
- `remainingMinutes` 표시
- Buzz 상세 진입 → 읽음 처리 → 목록에서 하이라이트 해제
- 댓글 작성 → 로컬 state 반영
- ANCHOR 수신자로 Buzz 작성 → 전송 성공
- 이미지 첨부 → S3 업로드 → Buzz에 이미지 표시
- `npx tsc --noEmit` 에러 없음

## Result

### Phase 1 — 정적 분석 ✅
- `npx tsc --noEmit` 에러 없음
- `npm run lint` 경고 없음

### Phase 2 — UI/State ✅
- `/buzzes` 빈 상태("받은 Buzz가 없습니다.") + "+ 작성" 버튼 정상 렌더링
- `/buzzes/new` 수신자 탭 3개(Anchor/라벨/직접 선택) + ANCHOR 드롭다운/범위 버튼 정상 동작
- 그래프 헤더에 Buzz 링크 노출

### Phase 3 — Edge Cases ✅
- 수신자 미선택(LABEL/MANUAL) 전송 시 클라이언트 검증 에러 즉시 표시
- 존재하지 않는 buzzId 접근 시 `/buzzes` 리다이렉트
- 빈 content 전송 시 에러 표시
- 라벨 없는 유저의 LABEL 탭 빈 상태 처리

### Task 13에서 사후 발견·수정된 버그 (app/buzzes/[buzzId]/page.tsx)
Task 10 구현 당시 두 가지 버그가 잠재해 있었고, Task 13 검증 중에 발견·수정됨.

1. **Next.js 15 `params` Promise await 누락**: `params.buzzId` 동기 접근 시
   `undefined` → `NaN` → buzzId 체크 실패로 상세 페이지 진입 불가. (`await params` 필요)
2. **`apiClient` 401 redirect가 `cookies()` context 오염**: 상세 내용은 `13-flag-invitation.md` 참조.
