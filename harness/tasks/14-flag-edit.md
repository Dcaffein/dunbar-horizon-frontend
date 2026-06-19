# Task 14: Flag 세부 수정

## 배경

Task 11에서 Flag 생성·삭제·참여를 구현했다.
Host가 생성 후 제목·설명·인원·일정을 수정할 수 있어야 한다.

## 사용 API

| 액션 | API |
|---|---|
| 제목·설명 수정 | `PATCH /api/v1/flags/{id}/details` `{ title, description }` |
| 인원 수정 | `PATCH /api/v1/flags/{id}/capacity` `{ capacity? }` |
| 일정 수정 | `PUT /api/v1/flags/{id}/schedule` `{ deadline?, startDateTime?, endDateTime? }` |

세 API 모두 Host만 호출 가능. `PUT /schedule`은 전체 교체(partial update 아님) — 모든 필드를 항상 전송해야 한다.

## UI 구조

`/flags/{id}/edit` — 별도 편집 페이지.

`FlagForm.tsx`를 재사용하고 `FlagDetailResult`의 현재 값을 초기값으로 채워 넣는다.

```
/flags/{id}/edit
┌──────────────────────────────────┐
│  Flag 수정                        │
│  제목 *      [현재 제목]           │
│  설명 *      [현재 설명]           │
│  시작 일시 * [현재 시작]           │
│  종료 일시 * [현재 종료]           │
│  모집 마감일  [현재 마감]  (선택)  │
│  최대 인원    [현재 인원]  (선택)  │
│                                   │
│              [취소]  [저장]        │
└──────────────────────────────────┘
```

- `/flags/{id}` 상세 페이지의 Host 영역에 [수정] 버튼 추가 → `/flags/{id}/edit` 이동
- 저장 시 변경된 항목에 따라 API 선택적 호출:
  - 제목 또는 설명이 변경됐으면 → `PATCH /details`
  - 인원이 변경됐으면 → `PATCH /capacity`
  - 일정(시작·종료·마감) 중 하나라도 변경됐으면 → `PUT /schedule` (전체 필드 전송)
- 저장 성공 후 `/flags/{id}`로 이동

## 상태 동기화

편집 페이지는 서버 컴포넌트가 `getFlagDetailAction(id)`로 현재 값을 조회해 초기값 전달.
저장 후 `/flags/{id}` 이동 → 서버 컴포넌트 재실행으로 최신 데이터 반영.

## 스코프 외

- `closeRecruitment` (모집 마감) — Task 11에서 구현 완료
- 참가자별 초대 권한 — Task 13에서 구현 완료

## 검증

- Flag 상세(Host 로그인)에 [수정] 버튼 표시
- `/flags/{id}/edit` 진입 시 현재 값이 폼에 채워짐
- 제목·설명 수정 → `PATCH /details` 200 → 상세 페이지에 반영
- 인원 수정 → `PATCH /capacity` 200 → 반영
- 일정 수정 → `PUT /schedule` 200 → 반영
- 비Host 접근 시 `/flags/{id}`로 리다이렉트
- `npx tsc --noEmit` 에러 없음

## Result

### Phase 1 — 정적 분석 ✅
- `npx tsc --noEmit` Task 14 파일 에러 없음 (pre-existing 에러는 별도 태스크)
- `npm run lint` 에러 0

### Phase 2 — UI/State ✅ PASS
- Flag 상세(Host 로그인) → 헤더에 [수정] 버튼 표시 확인
- `/flags/{id}/edit` 진입 → 제목·설명·일정·인원 현재 값 폼에 채워짐 확인
- 제목 수정 저장 → 상세 페이지 이동 + UI·백엔드 `title` 반영 확인
- 인원 수정 저장 → 백엔드 `capacity` 반영 확인
- 일정 수정 저장 → 백엔드 `startDateTime` 변경 확인
- 변경 없이 저장 → API 호출 없이 상세 페이지 이동 확인
- 취소 버튼 → `/flags/{id}` 복귀 확인

### 작업 중 발견·수정된 사항

#### 1. `GET /api/v1/accounts/me` — 존재하지 않는 엔드포인트 (기존 코드 버그)
Task 14 구현 당시 비Host 리다이렉트를 위해 현재 사용자 ID가 필요했다.
`flags/[id]/page.tsx`와 `buzzes/[buzzId]/page.tsx` 두 파일이 이미 `/api/v1/accounts/me`를 호출하고 있었으나, 해당 엔드포인트는 404를 반환하는 상태였다.

**해결:** 백엔드가 `GET /api/v1/users/me`(`MyProfileResult { id, email, nickname, profileImageUrl }`)와 `FlagDetailResult.isHost boolean`을 추가함.
- `edit/page.tsx`: `flagData.isHost`로 비Host 리다이렉트 → `/me` 호출 불필요
- `flags/[id]/page.tsx`: `/api/v1/users/me`로 변경 (`myUserId`는 `participants`에서 본인 찾는 용도로 유지)
- `buzzes/[buzzId]/page.tsx`: 동일하게 `/api/v1/users/me`로 변경

#### 2. `buzzes/[buzzId]/page.tsx` — 같은 버그 함께 수정
Buzz 상세 페이지도 동일 패턴으로 `/api/v1/accounts/me`를 호출하고 있었다.
`myUserId`는 `isMyBuzz`(삭제 버튼 표시)와 `isMine`(댓글 수정/삭제 버튼 표시) 두 곳에서 사용된다.
Flag와 달리 `BuzzDetailResult`에 `isMyBuzz` 필드가 없으므로 `/api/v1/users/me`로 교체해 클라이언트 비교 방식을 유지한다.
추후 백엔드가 `isMyBuzz` / `isMine` 필드를 응답에 추가하면 `/me` 호출도 제거 가능하다.

#### 3. 백엔드 DB collation 이슈 (검증 중 발견)
한국어 title로 Flag 생성 시 `POST /api/v1/flags` → 500 반환.
백엔드 DB collation 수정으로 해결됨. 프론트엔드 코드와 무관.

#### 4. 백엔드 신규 생성 Flag `GET` 500 이슈 (검증 중 발견)
collation 수정 직후에도 신규 생성 Flag의 `GET /api/v1/flags/{id}` → 500 반환.
백엔드 추가 수정으로 해결됨. 프론트엔드 코드와 무관.
