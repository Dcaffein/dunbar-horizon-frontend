# PLAN — Task 13: Flag 초대

> 참조 태스크: `harness/tasks/13-flag-invitation.md`
> 작업 브랜치: `agent/task-13-flag-invitation`

## 요구사항 분석

- Flag 상세 페이지 확장: 참가자 `canInvite` 토글(host 전용) + 친구 초대 섹션
- 알림 페이지 확장: `FLAG_INVITATION` 알림에 [수락][거절] 버튼
- 수락 → `/flags/{flagId}` 이동, 거절 → 버튼 숨김

## API 확인

| 액션 | 엔드포인트 |
|---|---|
| 친구 초대 | `POST /api/v1/flags/{flagId}/invitations` `{ inviteeId }` |
| 초대 수락 | `POST /api/v1/flag-invitations/{invitationId}/accept` |
| 초대 거절 | `POST /api/v1/flag-invitations/{invitationId}/reject` |
| 초대 권한 토글 | `PATCH /api/v1/flags/{flagId}/participants/{participantId}/invite-permission` `{ canInvite }` |

---

## 수정 파일

| 파일 | 내용 |
|---|---|
| `src/app/actions/flag.ts` | `inviteFriendAction`, `acceptInvitationAction`, `rejectInvitationAction`, `updateInvitePermissionAction` 추가 |
| `src/app/flags/[id]/page.tsx` | 친구 목록(`FriendshipDetail[]`) 추가 조회 → `FlagDetail`에 전달 |
| `src/components/Flag/FlagDetail.tsx` | ① 참가자 `canInvite` 토글(host 전용) ② 초대 섹션 ③ 토스트 |
| `src/components/Notifications/NotificationList.tsx` | `FLAG_INVITATION` 항목에 [수락][거절] 버튼 추가 |

---

## 상세 설계

### `flag.ts` 추가 Server Actions

```ts
inviteFriendAction(flagId, inviteeId)           → POST /api/v1/flags/{flagId}/invitations
acceptInvitationAction(invitationId)            → POST /api/v1/flag-invitations/{invitationId}/accept
rejectInvitationAction(invitationId)            → POST /api/v1/flag-invitations/{invitationId}/reject
updateInvitePermissionAction(flagId, participantId, canInvite) → PATCH .../invite-permission
```

### `FlagDetail.tsx` 확장

**참가자 목록 canInvite 토글** (host만 표시):
```
참가자 3명
├─ 박민준  [초대 가능 ✓]  ← 클릭하면 canInvite 토글
├─ 김철수  [초대 불가  ]
```
- 로컬 state로 `participants` 관리 (토글 후 즉시 반영)

**초대 섹션** (host OR canInvite 참가자만 표시):
- 친구 드롭다운 (이미 참가 중인 친구 제외)
- [초대 전송] 버튼 → `inviteFriendAction` → 토스트 3초 후 소멸

**토스트**: 컴포넌트 내 `toast: string | null` state, 3초 `setTimeout` 후 null

### `NotificationList.tsx` 확장

`FLAG_INVITATION` 타입 감지:
```tsx
const meta = n.metadata as unknown as Record<string, unknown>;
const invitationId = meta?.invitationId as number | undefined;
const flagId = meta?.flagId as number | undefined;
```

버튼 동작:
- [거절] → `rejectInvitationAction(invitationId)` → 해당 알림 state에서 `{ ...n, _rejected: true }` 표시
- [수락] → `acceptInvitationAction(invitationId)` → 읽음 처리 + `router.push('/flags/{flagId}')`
- 수락/거절 완료 후 버튼 숨김

---

## 테스트 시나리오

### Phase 1 — 정적 분석
- `npx tsc --noEmit` 에러 없음
- `npm run lint` error 없음

### Phase 2 — UI/State
- `/flags/{id}` 참가자 목록 canInvite 표시
- host 로그인 시 토글 버튼 노출
- 초대 섹션 드롭다운 렌더링
- `/notifications` FLAG_INVITATION 항목 [수락][거절] 버튼 표시

### Phase 3 — Edge Cases
- 빈 친구 목록 → "초대 가능한 친구가 없습니다." 표시
- 비host 비canInvite 참가자 → 초대 섹션 미표시
- metadata 없는 FLAG_INVITATION 알림 → 버튼 미표시
