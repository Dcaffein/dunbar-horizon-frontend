# PLAN — Task 35: Flag 초대 탭 분리 (받은 초대 / 보낸 초대)

## 요구사항 분석

현재 `/flags/invitations`는 알림 API를 `FLAG_INVITATION` 타입으로 필터링하는 우회 방식으로 구현되어 있다.
- 알림 읽음 처리 시 초대 목록에서도 사라지는 버그 존재
- 알림 페이지네이션 100개 제한으로 오래된 초대 누락 가능
- "보낸 초대" 목록 없음

백엔드 전용 API(`/api/v1/flag-invitations/received`, `/sent`)가 추가됐으므로 올바른 방식으로 교체하고 탭 UI를 추가한다.

## 작업 범위

### 1. `src/app/actions/flag.ts`
Server Action 3개 추가:
- `getReceivedInvitationsAction` — GET `/api/v1/flag-invitations/received` → `ReceivedFlagInvitationResult[]`
- `getSentInvitationsAction` — GET `/api/v1/flag-invitations/sent` → `SentFlagInvitationResult[]`
- `cancelInvitationAction` — DELETE `/api/v1/flag-invitations/${id}`

### 2. `src/app/flags/page.tsx`
헤더에 "초대" 링크 버튼 추가 (뒤로가기와 "+ 만들기" 사이):
```
← Flag          [초대]    [+ 만들기]
```

### 3. `src/app/flags/invitations/page.tsx`
- 알림 API 필터링 방식 제거
- 받은/보낸 초대 두 목록 `Promise.all` 병렬 조회
- `FlagInvitationList` 대신 `FlagInvitationTabs` 렌더
- 헤더 타이틀: "받은 초대" → "Flag 초대"

### 4. `src/components/Flag/FlagInvitationList.tsx`
- `NotificationResponse` 기반 코드 완전 제거
- `ReceivedFlagInvitationResult` 기반으로 교체
- props: `initialInvitations: ReceivedFlagInvitationResult[]`
- 카드: flagTitle, flagDescription, inviterNickname("OOO님이 초대했어요"), 상대 시간, [거절][수락] 버튼
- 수락 → `/flags/${flagId}` 이동, 거절 → 낙관적 카드 제거
- `readNotificationAction` 연동 제거

### 5. `src/components/Flag/FlagInvitationTabs.tsx` (신규)
- "받은 초대" / "보낸 초대" 탭 UI
- 받은 탭: `FlagInvitationList` 재사용
- 보낸 탭: `SentInvitationCard` — flagTitle, flagDescription, inviteeNickname("OOO님에게 보낸 초대"), 상대 시간, [취소] 버튼
- 취소 → 낙관적 카드 제거
- 빈 상태 각각 표시

## 테스트 시나리오 (TESTING_RULES 기반)

### Phase 1
- `npx tsc --noEmit` 에러 없음
- `npm run lint` 에러 없음

### Phase 2
- 받은 초대 탭 카드 렌더링 (flagTitle, flagDescription, inviterNickname, 상대 시간)
- 보낸 초대 탭 카드 렌더링 (flagTitle, flagDescription, inviteeNickname, 상대 시간)
- 받은 초대 수락 → `/flags/${flagId}` 이동
- 받은 초대 거절 → 카드 즉시 제거
- 보낸 초대 취소 → 카드 즉시 제거
- 빈 상태 각각 표시
- `/flags` 헤더의 "초대" 링크 → `/flags/invitations` 이동

### Phase 3
- 알림 읽음 처리와 초대 목록이 더 이상 연동되지 않음 확인
