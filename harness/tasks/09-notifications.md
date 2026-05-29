# Task 09: 알림

## 배경

친구 요청 수락(Task 07), 2-hop 추천(Task 08) 등 소셜 이벤트가 늘어났지만 유저에게 피드백이 없다.
알림 시스템으로 중요한 소셜 이벤트를 인지할 수 있게 한다.

Firebase 설정 완료(`lib/firebase.ts`, `public/firebase-messaging-sw.js`, `.env` VAPID 키 포함).
FCM 토큰 등록 및 푸시 알림 수신까지 이번 스코프에 포함한다.

## 사용 API

| 액션 | API |
|---|---|
| 미읽음 개수 조회 | `GET /api/v1/notifications/unread-count` → `number` |
| 알림 목록 조회 | `GET /api/v1/notifications?pageable=` → `SliceNotificationResponse` |
| 알림 읽음 처리 | `PATCH /api/v1/notifications/{notificationId}/read` → `NotificationResponse` |

```ts
NotificationResponse {
  id?: string;
  title?: string;
  content?: string;
  metadata?: { [key: string]: { [key: string]: unknown } };
  type?: NotificationResponseType;
  isRead?: boolean;
  createdAt?: string;
}

NotificationResponseType =
  | 'FRIEND_REQUEST_ACCEPT'  // 친구 요청 수락
  | 'TRACE_REVEALED'         // trace 노출
  | 'BUZZ_ARRIVAL'           // Buzz 도착
  | 'BUZZ_RESPONSE'          // Buzz 응답
  | 'FLAG_INVITATION'        // Flag 초대
  | 'FLAG_ENCORE'            // Flag 재참여
  | 'FLAG_CANCELED'          // Flag 취소
  | 'FLAG_SCHEDULE_CHANGED'  // Flag 일정 변경
  | 'NOTICE'                 // 공지
```

## UI 구조

### 헤더 배지

메인 헤더(`app/page.tsx` 또는 레이아웃)에 알림 아이콘 + 미읽음 배지 추가.
서버 컴포넌트에서 `getUnreadCount`를 조회해 초기값 렌더링.

```
┌─────────────────────────────────┐
│  Dunbar Horizon   [요청] [🔔 3] │  ← 3 = unread count
└─────────────────────────────────┘
```

### /notifications 페이지

알림 목록 전용 페이지. 서버 컴포넌트가 초기 목록 조회.

```
/notifications
┌──────────────────────────────────┐
│  알림                             │
├──────────────────────────────────┤
│  🟢 김철수님이 친구 요청을 수락했어요   │  ← FRIEND_REQUEST_ACCEPT
│     2시간 전                       │
├──────────────────────────────────┤
│  ○  [공지] 서비스 점검 안내         │  ← NOTICE, 읽음
│     어제                           │
└──────────────────────────────────┘
│  더 보기                           │  ← 페이지네이션
└──────────────────────────────────┘
```

- 미읽음 알림: 강조 표시 (배경색 또는 좌측 인디케이터)
- 알림 클릭 → `readNotification` 호출 → 읽음 처리 → 타입별 라우팅

### 타입별 클릭 라우팅

| type | 이동 |
|---|---|
| `FRIEND_REQUEST_ACCEPT` | `/` (그래프 — 새 친구 확인) |
| `TRACE_REVEALED` | `/` |
| `BUZZ_ARRIVAL` / `BUZZ_RESPONSE` | — (Buzz 미구현, 클릭 시 읽음만 처리) |
| `FLAG_*` | — (Flag 미구현, 클릭 시 읽음만 처리) |
| `NOTICE` | 클릭 시 읽음만 처리 |

## 상태 동기화

- 알림 목록: 서버 컴포넌트 초기 로드 + 클라이언트 "더 보기"로 추가 조회
- 읽음 처리: 클릭 시 `readNotificationAction` Server Action → 200 OK → 로컬 state에서 해당 알림 `isRead: true` 전환
- 헤더 배지: 서버 컴포넌트에서 초기 조회. 알림 페이지 방문 후 돌아올 때 자연스럽게 갱신됨 (서버 컴포넌트 재실행)

## FCM 토큰 등록

로그인 후 클라이언트에서 `requestNotificationPermission()`(`lib/firebase.ts`) 호출 → 브라우저 알림 권한 요청 → FCM 토큰 발급 → `POST /api/v1/notifications/device-token { token }` 등록.

Server Action 불가(브라우저 API 필요) — 클라이언트 컴포넌트에서 `useEffect`로 처리.
토큰은 브라우저/디바이스마다 다르므로 로그인 시마다 재등록이 안전하다.

## 스코프 외

- 전체 읽음 처리 (일괄 read) — 백엔드 API 없음
- 알림 삭제 — 백엔드 API 없음

## 검증

- 헤더에 미읽음 배지 표시
- `/notifications` 진입 시 알림 목록 렌더링
- 미읽음 알림 강조 표시
- 알림 클릭 → 읽음 처리 → 강조 해제
- `FRIEND_REQUEST_ACCEPT` 알림 클릭 → `/` 이동
- "더 보기" — 추가 페이지 로드
- `npx tsc --noEmit` 에러 없음

## Result

**완료일**: 2026-05-30
**브랜치**: `agent/task-09-notifications`

### 구현 파일

| 파일 | 변경 |
|---|---|
| `src/app/actions/notification.ts` | 신규 — getUnreadCount / getNotifications / readNotification / registerDeviceToken Server Action |
| `src/app/notifications/page.tsx` | 신규 — Server Component |
| `src/components/Notifications/NotificationBell.tsx` | 신규 — 헤더 벨 아이콘 + 미읽음 배지 + FCM 토큰 등록 |
| `src/components/Notifications/NotificationList.tsx` | 신규 — 알림 목록 + 더 보기 페이지네이션 |
| `src/app/page.tsx` | 수정 — unread count 조회 + NotificationBell 추가 |

### Phase 2 검증 결과 (Playwright headless)

| 항목 | 결과 |
|---|---|
| 헤더 알림 벨 아이콘 렌더링 | ✅ |
| /notifications 페이지 진입 | ✅ |
| 알림 없을 때 빈 상태 렌더링 | ✅ |
| 뒤로가기 링크 → / 이동 | ✅ |

### Phase 3 검증 결과 (실제 API)

| 항목 | 결과 |
|---|---|
| 헤더 미읽음 배지 (SSR unread count) | ✅ "2" |
| 알림 목록 조회 (2개) | ✅ |
| 미읽음 강조 표시 (bg-indigo-50) | ✅ |
| 알림 클릭 → readNotification Server Action 200 | ✅ |
| 읽음 처리 후 강조 해제 | ✅ |
| FRIEND_REQUEST_ACCEPT 클릭 → / 이동 | ✅ |

> 알림 생성 방법: dev 유저 생성 → lsh@test.com이 친구 요청 전송 → dev 유저 수락 → FRIEND_REQUEST_ACCEPT 알림 생성
