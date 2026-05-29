# PLAN — Task 09: 알림

> 참조 태스크: `harness/tasks/09-notifications.md`
> 작업 브랜치: `agent/task-09-notifications`

## 요구사항 분석

- 헤더 미읽음 배지 (서버 컴포넌트 초기 조회)
- `/notifications` 알림 목록 페이지 (page 기반 페이지네이션, "더 보기")
- 알림 클릭 → 읽음 처리 → 타입별 라우팅
- FCM 토큰 등록 (클라이언트 useEffect → Server Action)

---

## 생성 / 수정 파일

| 파일 | 신규/수정 | 내용 |
|---|---|---|
| `src/app/actions/notification.ts` | 신규 | Server Actions 4개 |
| `src/app/notifications/page.tsx` | 신규 | Server Component |
| `src/components/Notifications/NotificationBell.tsx` | 신규 | 헤더 벨 + 배지 + FCM 등록 |
| `src/components/Notifications/NotificationList.tsx` | 신규 | 알림 목록 + 더 보기 |
| `src/app/page.tsx` | 수정 | unread count 조회 + NotificationBell 추가 |

---

## 상세 설계

### `src/app/actions/notification.ts`

```ts
"use server"

getUnreadCountAction()
  → GET /api/v1/notifications/unread-count
  → { success, data: number }

getNotificationsAction(page: number = 0, size: number = 20)
  → GET /api/v1/notifications?page={page}&size={size}
  → { success, data: SliceNotificationResponse }

readNotificationAction(notificationId: string)
  → PATCH /api/v1/notifications/{notificationId}/read
  → { success, data: NotificationResponse }

registerDeviceTokenAction(token: string)
  → POST /api/v1/notifications/device-token { token }
  → { success }
```

### `src/app/page.tsx` — 수정

서버 컴포넌트에서 `getUnreadCountAction()` 조회 후 `NotificationBell`에 `initialUnreadCount` prop으로 전달.

### `src/components/Notifications/NotificationBell.tsx`

- `"use client"` 컴포넌트
- prop: `initialUnreadCount: number`
- `/notifications`로 이동하는 Link + 벨 아이콘
- 배지: `initialUnreadCount > 0`이면 숫자 표시 (최대 99+)
- `useEffect`: 마운트 시 `requestNotificationPermission()` 호출 → 토큰 있으면 `registerDeviceTokenAction(token)` 호출

### `src/app/notifications/page.tsx`

서버 컴포넌트. `getNotificationsAction(0)` 초기 조회 후 `NotificationList`에 전달.

### `src/components/Notifications/NotificationList.tsx`

- `"use client"` 컴포넌트
- props: `initialNotifications: NotificationResponse[]`, `initialHasMore: boolean`
- state: `notifications`, `page`, `hasMore`, `isLoading`
- 각 알림 카드:
  - 미읽음(`isRead === false`): 좌측 indigo 인디케이터 + 밝은 배경
  - 타입 아이콘 (FRIEND_REQUEST_ACCEPT: 👤, NOTICE: 📢, 기타: 🔔)
  - `title`, `content`, `createdAt` (상대시간)
  - 클릭 → `readNotificationAction` → 로컬 state `isRead: true` → 타입별 라우팅
- "더 보기" 버튼: `hasMore`일 때 노출, 클릭 시 `getNotificationsAction(page + 1)` → 목록에 append

### 타입별 라우팅

```ts
const NOTIFICATION_ROUTES: Partial<Record<NotificationResponseType, string>> = {
  FRIEND_REQUEST_ACCEPT: '/',
  TRACE_REVEALED: '/',
};
// 나머지 타입: 읽음 처리만, 이동 없음
```

### 상대시간 유틸

`createdAt` → "방금", "N분 전", "N시간 전", "어제", "N일 전" 형식.

---

## 테스트 시나리오

### Phase 1 — 정적 분석
- `npx tsc --noEmit` 에러 없음

### Phase 2 — UI/State
- 메인 헤더 벨 아이콘 렌더링
- `/notifications` 페이지 진입 → 알림 목록 렌더링
- 미읽음 알림 강조 표시

### Phase 3 — 실제 API
- unread count Server Action 200
- 알림 목록 Server Action 200
- 알림 클릭 → 읽음 처리 Server Action 200 → isRead 전환
