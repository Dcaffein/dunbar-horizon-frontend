# Task 35: Flag 초대 탭 분리 (받은 초대 / 보낸 초대)

## 배경

현재 `/flags/invitations` 페이지는 "받은 초대"만 표시하고, 알림 목록을 `FLAG_INVITATION` 타입으로 필터링하는 우회 방식으로 구현되어 있다.

문제점:
- 알림 읽음 처리 시 초대 목록에서도 사라짐
- 알림 페이지네이션(기본 20개)에 걸리면 오래된 초대 누락
- "보낸 초대" 목록이 없음

백엔드에서 전용 API가 추가됐으므로 올바른 방식으로 교체하고 탭 UI로 분리한다.

## 사용 API (Orval 생성 완료)

| 액션 | API | 반환 타입 |
|---|---|---|
| 받은 초대 목록 | `GET /api/v1/flag-invitations/received` | `ReceivedFlagInvitationResult[]` |
| 보낸 초대 목록 | `GET /api/v1/flag-invitations/sent` | `SentFlagInvitationResult[]` |
| 수락 | `POST /api/v1/flag-invitations/${id}/accept` | 기존 유지 |
| 거절 | `POST /api/v1/flag-invitations/${id}/reject` | 기존 유지 |
| 취소 | `DELETE /api/v1/flag-invitations/${id}` | 기존 유지 |

```ts
ReceivedFlagInvitationResult {
  id?: number
  flagId?: number
  flagTitle?: string
  flagDescription?: string
  inviterNickname?: string
  createdAt?: string
}

SentFlagInvitationResult {
  id?: number
  flagId?: number
  flagTitle?: string
  flagDescription?: string
  inviteeNickname?: string
  createdAt?: string
}
```

## UI 구조

```
/flags/invitations
┌──────────────────────────────────┐
│  ← Flag 초대                      │
├──────────────────────────────────┤
│  [받은 초대]  [보낸 초대]           │  ← 탭
├──────────────────────────────────┤
│  🚩 [flagTitle]                   │
│     [flagDescription]             │
│     홍길동님이 초대했어요            │  ← inviterNickname (받은 탭)
│     3시간 전                       │
│     [거절]  [수락]                 │
├──────────────────────────────────┤
│  🚩 [flagTitle]                   │
│     [flagDescription]             │
│     김영희님에게 보낸 초대           │  ← inviteeNickname (보낸 탭)
│     1일 전                        │
│     [취소]                        │
└──────────────────────────────────┘
```

- 수락 → 해당 `/flags/${flagId}` 로 이동
- 거절 / 취소 → 해당 카드 즉시 제거 (낙관적 업데이트)
- 빈 상태: "받은 초대가 없습니다." / "보낸 초대가 없습니다."

## UI 진입점

현재 `/flags/invitations`는 알림 클릭을 통해서만 접근 가능하다.
`/flags` 페이지 헤더에 "초대" 링크를 추가해 직접 접근할 수 있도록 한다.

```
헤더 현재:   ← Flag                    [+ 만들기]
헤더 변경:   ← Flag          [초대]    [+ 만들기]
```

## 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `src/app/actions/flag.ts` | `getReceivedInvitationsAction` / `getSentInvitationsAction` / `cancelInvitationAction` 추가 |
| `src/app/flags/page.tsx` | 헤더에 `/flags/invitations` 링크 추가 |
| `src/app/flags/invitations/page.tsx` | 알림 필터링 제거 → 두 목록 병렬 조회, `FlagInvitationTabs` 렌더 |
| `src/components/Flag/FlagInvitationList.tsx` | `NotificationResponse` 기반 코드 제거, `ReceivedFlagInvitationResult` 기반으로 교체 |
| `src/components/Flag/FlagInvitationTabs.tsx` | 신규 — 탭 UI + 받은/보낸 카드 렌더링 |

## 검증

### Phase 1
- `npx tsc --noEmit` 에러 없음
- `npm run lint` 에러 없음

### Phase 2
- 받은 초대 탭 — 초대 카드 렌더링 (flagTitle, flagDescription, inviterNickname, 상대 시간)
- 보낸 초대 탭 — 초대 카드 렌더링 (flagTitle, flagDescription, inviteeNickname, 상대 시간)
- 받은 초대 수락 → 해당 Flag 페이지 이동
- 받은 초대 거절 → 카드 즉시 제거
- 보낸 초대 취소 → 카드 즉시 제거
- 빈 상태 각각 표시

### Phase 3
- 실제 초대 생성 후 받은 탭 확인
- 수락 후 `/flags/${flagId}` 정상 이동 확인
- 알림 읽음 처리와 초대 목록이 더 이상 연동되지 않음 확인
