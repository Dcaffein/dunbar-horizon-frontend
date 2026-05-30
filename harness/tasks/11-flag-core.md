# Task 11: Flag 핵심 기능

## 배경

Flag는 친구들과 함께하는 이벤트/모임이다.
호스트가 Flag를 생성하고, 친구들이 참여하거나 초대를 받는 방식으로 운영된다.

이번 task는 Flag의 핵심 흐름만 구현한다.
초대, Memorial, 댓글은 별도 task에서 다룬다.

## 용어

- **Flag**: 제목·설명·일정·인원이 있는 이벤트/모임
- **Host**: Flag를 만든 사람. 모집 마감·삭제 권한 보유
- **Participant**: 참여 중인 사람
- **Encore**: 종료된 Flag를 재개최. `parentFlagId`로 원본 Flag 참조
- **모집 마감(closeRecruitment)**: 더 이상 참여를 받지 않음. 삭제는 아님

## 사용 API

| 액션 | API |
|---|---|
| 내가 주최하는 Flag | `GET /api/v1/flags/me/hosting` → `FlagResult[]` |
| 내가 참여하는 Flag | `GET /api/v1/flags/me/participating` → `FlagResult[]` |
| 친구들이 주최하는 Flag | `GET /api/v1/flags/friends` → `FlagResult[]` |
| Flag 생성 | `POST /api/v1/flags` → `number` (flagId) |
| Flag 삭제 | `DELETE /api/v1/flags/{id}` |
| 모집 마감 | `PATCH /api/v1/flags/{id}/schedule/deadline` |
| 참여 | `POST /api/v1/flags/{id}/participants` |
| 참여 취소 | `DELETE /api/v1/flags/{id}/participants` |

```ts
FlagCreateRequest {
  parentFlagId?: number;   // Encore 시 원본 Flag ID
  title: string;
  description: string;
  capacity?: number;       // 최대 참가자 수
  deadline?: string;       // 모집 마감일 (ISO 8601)
  startDateTime: string;
  endDateTime: string;
}

FlagResult {
  id?: number;
  title?: string;
  description?: string;
  capacity?: number;
  status?: string;         // "OPEN" | "CLOSED" 등
  schedule?: {
    deadline?: string;
    startDateTime?: string;
    endDateTime?: string;
  };
  host?: {
    id?: number;
    nickname?: string;
    profileImageUrl?: string;
  };
}
```

## UI 구조

### `/flags` — 목록 페이지 (탭 3개)

```
/flags                                    [Flag 만들기]
┌──────────────────────────────────────────────────┐
│  [주최 중]  [참여 중]  [친구 Flag]                │
├──────────────────────────────────────────────────┤
│  📍 주말 등산 모임                                │
│     5/8명 · 모집 중 · 토요일 오전 9시             │
│     [모집 마감]  [삭제]          ← host 탭에서만  │
├──────────────────────────────────────────────────┤
│  📍 금요일 퇴근 후 맥주                           │
│     3/10명 · 마감 임박 · 내일 오후 7시            │
│     [참여 취소]              ← 참여 중 탭에서만   │
├──────────────────────────────────────────────────┤
│  📍 박민준: 한강 피크닉                           │
│     2/6명 · 모집 중 · 이번 주 일요일              │
│     [참여하기]              ← 친구 Flag 탭에서만  │
└──────────────────────────────────────────────────┘
```

- `status`가 `CLOSED`이면 [참여하기] 버튼 비활성
- `deadline`이 지났으면 만료 표시
- 탭별 서버 컴포넌트 초기 로드

### `/flags/new` — Flag 생성 페이지

```
/flags/new
┌──────────────────────────────────┐
│  제목 *          [________________]│
│  설명 *          [________________]│
│                  [________________]│
│  시작 일시 *     [날짜] [시간]      │
│  종료 일시 *     [날짜] [시간]      │
│  모집 마감일     [날짜]  (선택)     │
│  최대 인원       [숫자]  (선택)     │
│                                   │
│                  [취소]  [만들기]  │
└──────────────────────────────────┘
```

Encore 생성 시: `/flags/new?parentFlagId={id}` — 원본 Flag의 제목·설명을 초기값으로 채워줌.

### Flag 카드 클릭 → 상세 모달 또는 `/flags/{id}`

상세에서 추가로 보여줄 정보:
- 전체 설명
- 남은 시간 / 모집 마감까지
- host 정보

PLAN 단계에서 모달 vs 별도 페이지 결정.

## 상태 동기화

- 목록: 서버 컴포넌트 초기 로드. 참여/취소/생성 후 `router.push('/flags')`로 이동해 서버 컴포넌트 재실행
- 모집 마감·삭제: 200 OK 후 `router.refresh()` (같은 페이지에서 처리)
- 참여·참여취소: 200 OK 후 `router.refresh()`

## 스코프 외

- Flag 초대 (`invite`, `updateInvitePermission`) — Task 12
- Memorial — Task 13
- Flag 댓글 — Task 13 또는 별도
- Flag 세부 수정 (`modifyDetails`, `modifyCapacity`, `replaceSchedule`) — 추후 태스크
- 참가자 목록 조회 — 백엔드 API 없음

## 검증

- `/flags` 진입 시 탭 3개 렌더링
- 주최 중 탭 — 내 Flag 목록 + 모집 마감·삭제 버튼
- 참여 중 탭 — 참여 Flag 목록 + 참여 취소 버튼
- 친구 Flag 탭 — 친구 Flag 목록 + 참여하기 버튼 (CLOSED 시 비활성)
- Flag 생성 → 목록 반영
- 모집 마감 → status CLOSED 반영
- 참여 → 참여 중 탭에서 확인
- 참여 취소 → 목록에서 제거
- Flag 삭제 → 목록에서 제거
- `npx tsc --noEmit` 에러 없음

## Result

### Phase 1 — 정적 분석 ✅
- `npx tsc --noEmit` 에러 없음
- `npm run lint` error 0 (warning은 모두 pre-existing)
- JSX-in-try-catch 린트 오류 수정 (`buzzes/[buzzId]/page.tsx` 포함)

### Phase 2 — UI/State ✅
- `/flags` 탭 3개(주최 중/참여 중/친구 Flag) 렌더링 + 탭 전환 확인
- `/flags/new` 폼 필수 필드 + 클라이언트 검증(빈 제출, 날짜 순서 오류) 확인
- `/flags/new?parentFlagId=1` → "Encore 생성" 모드(배너 + 버튼) 확인
- 그래프 헤더 Flag 링크 노출 확인

### Phase 3 — Edge Cases ✅
- 빈 탭 3개 모두 빈 상태 메시지 확인
- 잘못된 ID(`/flags/999999`, `/flags/not-a-number`) → `/flags` 리다이렉트
- capacity = 0 제출 → 에러 메시지 확인
- 그래프 Flag 링크 클릭 → 페이지 이동 확인
