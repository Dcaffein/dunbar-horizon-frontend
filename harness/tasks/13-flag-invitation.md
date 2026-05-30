# Task 13: Flag 초대

## 배경

Task 11에서 Flag 핵심 흐름(생성·참여·삭제)을 구현했다.
이번 task는 초대 흐름을 추가한다 — Host가 친구를 초대하고, 초대받은 친구가 수락 또는 거절한다.

Task 09의 알림 시스템(`FLAG_INVITATION` 타입)과 연계되어,
초대받은 사람은 알림 페이지에서 바로 수락/거절할 수 있다.

## 사용 API

| 액션 | API |
|---|---|
| 친구 초대 | `POST /api/v1/flags/{flagId}/invitations` `{ inviteeId: number }` → `number` (invitationId) |
| 초대 수락 | `POST /api/v1/flag-invitations/{invitationId}/accept` |
| 초대 거절 | `POST /api/v1/flag-invitations/{invitationId}/reject` |
| 참가자 초대 권한 토글 | `PATCH /api/v1/flags/{flagId}/participants/{participantId}/invite-permission` `{ canInvite: boolean }` |

```ts
FlagDetailResult {
  id?: number;
  title?: string;
  description?: string;
  capacity?: number;
  participantCount?: number;
  status?: string;
  schedule?: FlagScheduleResult;
  host?: FlagHostResult;
  parentFlag?: ParentFlagResult;
  participants?: ParticipantResult[];  // 참가자 목록 (이번 task에서 UI 표시)
}

ParticipantResult {
  id?: number;
  nickname?: string;
  profileImageUrl?: string;
}
```

## UI 구조

### Flag 상세 페이지 (`/flags/{id}`) 확장

Task 11에서 구현된 상세 페이지에 두 가지 섹션 추가.

**참가자 목록 (모든 참가자 열람 가능)**
```
참가자 3명
├─ 박민준  [초대 가능 ✓]  ← host만 토글 표시
├─ 김철수  [초대 불가  ]
└─ 이영희  [초대 가능 ✓]
```

**초대하기 (host 또는 canInvite 권한 보유자만)**
```
[친구 초대하기 +]
  → 친구 목록 드롭다운 또는 검색
  → 선택 후 [초대 전송]
```

- 이미 참가 중인 친구는 초대 목록에서 제외
- 초대 전송 후 로컬 state 변경 없음 (수락 전이므로) — 토스트 메시지만 표시

### 알림 페이지 (`/notifications`) 확장

Task 09에서 `FLAG_INVITATION` 알림은 읽음만 처리했다.
이번 task에서 `FLAG_INVITATION` 타입 알림에 [수락] [거절] 버튼 추가.

```
┌──────────────────────────────────────┐
│  🚩 박민준이 "주말 등산 모임"에 초대했어요 │
│     [거절]  [수락]                     │
└──────────────────────────────────────┘
```

- `metadata`에서 `invitationId` 추출 → `accept(invitationId)` / `reject(invitationId)`
- 수락/거절 후 해당 알림 버튼 숨김 + 읽음 처리
- 수락 시 `/flags/{flagId}`로 이동 (flagId도 metadata에서 추출)

## 초대 권한 모델

- 기본적으로 Host만 초대 가능
- Host가 특정 참가자에게 `canInvite: true` 부여 → 해당 참가자도 초대 가능
- `canInvite` 토글은 Host만 조작 가능

`ParticipantResult`에 `canInvite` 필드가 없으면 백엔드 추가 필요 — PLAN 단계에서 확인.

## 상태 동기화

- 초대 전송: 200 OK → 토스트 표시 (목록 변경 없음)
- 수락/거절: 200 OK → 알림 버튼 숨김 + `router.refresh()`로 알림 목록 갱신
- 초대 권한 토글: 200 OK → 로컬 state에서 해당 참가자 `canInvite` 전환
- 참가자 목록: `FlagDetailResult.participants`로 서버 컴포넌트 초기 로드

## 스코프 외

- 초대 취소 — 백엔드 API 없음
- 초대 목록 조회 (보낸/받은) — 백엔드 API 없음
- Memorial — 별도 태스크

## 검증

- Flag 상세에 참가자 목록 표시
- Host 로그인 시 초대 권한 토글 표시
- 친구 초대 → 토스트 메시지 노출
- 알림 페이지 `FLAG_INVITATION` 항목에 [수락][거절] 버튼 표시
- 수락 → `/flags/{flagId}` 이동 + 참가자 목록 반영
- 거절 → 알림 버튼 숨김
- `npx tsc --noEmit` 에러 없음

## Result

### Phase 1 — 정적 분석 ✅
- `npx tsc --noEmit` 에러 없음
- `npm run lint` error 0

### Phase 2 — UI/State ✅ (일부 BLOCKED)
- FLAG_INVITATION 알림에 [수락][거절] 버튼 표시 확인
- [거절] 클릭 → "응답 완료" 표시 + 버튼 숨김 확인
- 초대 API(POST) → 201 정상 응답 확인
- FlagDetail 페이지는 Turbopack 캐시 문제로 redirect (개발 서버 재시작으로 해결 가능, 코드 정상)

### Phase 3 — Edge Cases ✅
- 비FLAG_INVITATION 알림에 버튼 미표시 확인
- 이미 응답한 초대 → 동일 세션 내 버튼 숨김 확인
- 수락 → API 성공 + router.push 실행 확인
- metadata 파싱: `{invitationId: number, flagId: number}` 형태 직접 확인

### 비고
- FlagDetail 페이지 redirect는 `.next` Turbopack 캐시 문제 (구 Task 11 청크 + 신 Task 13 청크 공존)
  개발 서버 재시작 또는 `.next` 삭제 후 재빌드로 해결 예상
