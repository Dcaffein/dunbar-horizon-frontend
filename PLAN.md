# PLAN — Task 11: Flag 핵심 기능

> 참조 태스크: `harness/tasks/11-flag-core.md`
> 작업 브랜치: `agent/task-11-flag-core`

## 요구사항 분석

- `/flags` 탭 3개 목록 (주최 중 / 참여 중 / 친구 Flag)
- `/flags/new` Flag 생성 + Encore (`parentFlagId`만 전달, title/description 새로 작성)
- `/flags/{id}` Flag 상세 (parentFlag 링크 + 참여자 목록 + host/참여 구분 버튼)
- 모집 마감·참여·참여취소·삭제: Server Action → `router.refresh()`
- 그래프 헤더에 Flag 링크 추가

## API 확인

| 액션 | 엔드포인트 | 응답 |
|---|---|---|
| 주최 Flag 목록 | `GET /api/v1/flags/me/hosting` | `FlagResult[]` |
| 참여 Flag 목록 | `GET /api/v1/flags/me/participating` | `FlagResult[]` |
| 친구 Flag 목록 | `GET /api/v1/flags/friends` | `FlagResult[]` |
| Flag 상세 | `GET /api/v1/flags/{id}` | `FlagDetailResult` |
| Flag 생성 | `POST /api/v1/flags` | `number` (flagId) |
| Flag 삭제 | `DELETE /api/v1/flags/{id}` | — |
| 모집 마감 | `PATCH /api/v1/flags/{id}/schedule/deadline` | — |
| 참여 | `POST /api/v1/flags/{id}/participants` | — |
| 참여 취소 | `DELETE /api/v1/flags/{id}/participants` | — |

---

## 생성 / 수정 파일

| 파일 | 신규/수정 | 내용 |
|---|---|---|
| `src/app/actions/flag.ts` | 신규 | Server Actions |
| `src/app/flags/page.tsx` | 신규 | Server Component — 탭 3개 병렬 조회 |
| `src/components/Flag/FlagList.tsx` | 신규 | Client Component — 탭 UI + FlagCard 목록 |
| `src/app/flags/[id]/page.tsx` | 신규 | Server Component — 상세 조회 |
| `src/components/Flag/FlagDetail.tsx` | 신규 | Client Component — 상세 + 액션 버튼 |
| `src/app/flags/new/page.tsx` | 신규 | Server Component — Encore searchParams 처리 |
| `src/components/Flag/FlagForm.tsx` | 신규 | Client Component — 생성 폼 |
| `src/app/page.tsx` | 수정 | 헤더에 Flag 링크 추가 |

---

## 상세 설계

### `src/app/actions/flag.ts`

```ts
"use server"

getHostingFlagsAction()       → GET /api/v1/flags/me/hosting        → FlagResult[]
getParticipatingFlagsAction() → GET /api/v1/flags/me/participating   → FlagResult[]
getFriendFlagsAction()        → GET /api/v1/flags/friends            → FlagResult[]
getFlagDetailAction(id)       → GET /api/v1/flags/{id}              → FlagDetailResult
createFlagAction(body)        → POST /api/v1/flags                   → number (flagId)
deleteFlagAction(id)          → DELETE /api/v1/flags/{id}
closeRecruitmentAction(id)    → PATCH /api/v1/flags/{id}/schedule/deadline
participateAction(id)         → POST /api/v1/flags/{id}/participants
leaveAction(id)               → DELETE /api/v1/flags/{id}/participants
```

### `/flags` — FlagList

서버 컴포넌트에서 3개 목록 병렬 조회:
```ts
const [hosting, participating, friends] = await Promise.all([
  getHostingFlagsAction(),
  getParticipatingFlagsAction(),
  getFriendFlagsAction(),
]);
```

FlagList (Client Component):
- `activeTab: "hosting" | "participating" | "friends"` state
- 탭별 FlagCard 목록 렌더링
- 카드 클릭 → `/flags/{id}`

FlagCard 공통 표시:
- 제목
- `parentFlagId` 있으면 "Encore" 배지
- `{participantCount}/{capacity}명` (capacity 없으면 `{participantCount}명 참여 중`)
- status === "CLOSED" → "마감됨" 배지
- `schedule.endDateTime` 기준 남은 시간 (D-day / N시간 / 만료)
- `schedule.deadline` 지났으면 "모집 마감" 표시

탭별 액션 버튼:
- **주최 중**: [모집 마감] (CLOSED 아닐 때) + [삭제] + [Encore]
- **참여 중**: [참여 취소]
- **친구 Flag**: [참여하기] (CLOSED이면 비활성)

### `/flags/{id}` — FlagDetail

서버 컴포넌트에서 `getFlagDetailAction(id)` 조회:
```ts
const result = await getFlagDetailAction(id);
if (!result.success) redirect("/flags");
```

`myUserId`(`GET /api/v1/accounts/me`)와 `flag.host.id` 비교로 host 판별.
`flag.participants`에 myUserId 있으면 isParticipating = true.

FlagDetail (Client Component):
- 제목, 전체 설명, host 정보
- 일정 (시작/종료 일시, 모집 마감)
- `parentFlag` 있으면 "원본 Flag: {title}" → `/flags/{parentFlag.id}` 링크
- 참여자 아바타 목록 + `{participantCount}/{capacity}명`
- host이면: [모집 마감] + [삭제]
- 참여 중이고 host 아니면: [참여 취소]
- 미참여 친구 Flag이면: [참여하기] (CLOSED 비활성)
- 각 버튼 → Server Action → `router.refresh()`

### `/flags/new` — FlagForm (Encore 포함)

서버 컴포넌트에서 `parentFlagId` searchParams만 읽고 FlagForm에 전달:
```ts
const { parentFlagId } = await searchParams;
return <FlagForm parentFlagId={parentFlagId ? Number(parentFlagId) : undefined} />;
```

Encore 버튼(상세 페이지): `/flags/new?parentFlagId={id}` 링크.
title/description은 사용자가 새로 작성.

FlagForm (Client Component):
- 제목* , 설명*, 시작 일시*, 종료 일시*, 모집 마감일(선택), 최대 인원(선택)
- `datetime-local` input 사용
- `parentFlagId` 있으면 "Encore 생성" 헤딩 표시
- 제출 → `createFlagAction` → 성공 시 `router.push("/flags")`

### `src/app/page.tsx` 수정

헤더에 Flag 링크 추가 (Buzz 링크 옆):
```tsx
<Link href="/flags" className="...">
  <FlagIcon /> Flag
</Link>
```

---

## 테스트 시나리오

### Phase 1 — 정적 분석
- `npx tsc --noEmit` 에러 없음
- `npm run lint` 경고 없음

### Phase 2 — UI/State
- `/flags` 탭 3개 렌더링 및 전환
- `/flags/new` 폼 필수 필드 렌더링
- `/flags/new?parentFlagId=1` 진입 시 "Encore 생성" 헤딩 표시
- 필수 필드 비워두고 제출 → 에러 표시

### Phase 3 — Edge Cases
- 빈 목록 탭 → 빈 상태 메시지
- status === "CLOSED" → 참여하기 버튼 비활성
- 잘못된 `/flags/{id}` → `/flags` 리다이렉트
- 종료일 지난 Flag → 만료 표시
