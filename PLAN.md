# PLAN: Task 34 — FCM 포그라운드 알림 핸들러

## 작업 범위

| 파일 | 변경 내용 |
|---|---|
| `src/lib/firebase.ts` | `setupForegroundHandler(cb)` 추가 |
| `src/components/FcmInitializer.tsx` | NEW — 핸들러 등록 + 인앱 토스트 UI |
| `src/app/layout.tsx` | `<FcmInitializer />` 추가 |

## 구현 상세

### 1. `src/lib/firebase.ts`에 추가

```ts
export function setupForegroundHandler(
  onNotification: (title: string, body: string) => void
): () => void {
  const m = getFirebaseMessaging();
  if (!m) return () => {};
  return onMessage(m, (payload) => {
    const title = payload.notification?.title ?? 'Dunbar Horizon';
    const body = payload.notification?.body ?? '';
    onNotification(title, body);
  });
}
```

### 2. `src/components/FcmInitializer.tsx` (NEW)

- `"use client"` 컴포넌트
- `useState<{ title: string; body: string } | null>` — 토스트 상태
- `useEffect` → `setupForegroundHandler(setToast)` + cleanup unsubscribe
- `useEffect[toast]` → toast가 세팅되면 5초 후 null로 자동 닫힘
- 우상단 fixed 토스트 UI: 🔔 아이콘 + 제목(bold) + 본문 + X 버튼

### 3. `src/app/layout.tsx`

`<body>` 닫기 태그 바로 앞에 `<FcmInitializer />` 추가
