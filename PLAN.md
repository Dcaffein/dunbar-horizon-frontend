# PLAN: Task 32 — FCM 토큰 라이프사이클 관리

## 요구사항 분석

- 최초 권한 요청을 사용자 제스처(토글 클릭)에 연결
- 기기별 독립 알람 ON/OFF 토글 (`/notifications` 페이지 헤더)
- 토큰 로테이션 자동 감지 및 교체 (NotificationBell useEffect)
- 로그아웃 시 FCM 토큰을 백엔드에 전달 (LogoutButton → localStorage 읽기)
- 브라우저 권한 취소 시 이전 토큰으로 백엔드 정리

---

## 작업 파일 목록

| # | 파일 | 변경 종류 | 내용 |
|---|---|---|---|
| 1 | `src/lib/firebase.ts` | 수정 | `getCurrentToken()` 추가 |
| 2 | `src/app/actions/notification.ts` | 수정 | `removeDeviceTokenAction` / `checkDeviceTokenStatusAction` 추가 |
| 3 | `src/app/actions/auth.ts` | 수정 | `logoutAction(fcmToken?: string)` 시그니처 변경, body에 fcmToken 포함 |
| 4 | `src/components/LogoutButton.tsx` | 수정 | `"use client"` 전환, onClick에서 localStorage 읽어 logoutAction 호출 |
| 5 | `src/components/Notifications/NotificationBell.tsx` | 수정 | requestNotificationPermission 제거 → getCurrentToken 기반 조용한 초기화 |
| 6 | `src/hooks/useFcmToken.ts` | 신규 | 토글 상태 조회 / ON / OFF 로직 |
| 7 | `src/components/Notifications/AlarmToggle.tsx` | 신규 | useFcmToken 사용하는 토글 UI 컴포넌트 |
| 8 | `src/app/notifications/page.tsx` | 수정 | 헤더에 `<AlarmToggle />` 추가 |

---

## 상세 구현 계획

### Step 1: `src/lib/firebase.ts`

`getCurrentToken()` 추가 — `Notification.permission !== 'granted'`이면 null 즉시 반환.
권한 요청 없이 Firebase SDK `getToken()`만 호출.

```ts
export async function getCurrentToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (Notification.permission !== 'granted') return null;
  const m = getFirebaseMessaging();
  if (!m) return null;
  try {
    return await getToken(m, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.register('/firebase-messaging-sw.js'),
    });
  } catch {
    return null;
  }
}
```

---

### Step 2: `src/app/actions/notification.ts`

두 Server Action 추가:

```ts
export async function removeDeviceTokenAction(token: string) {
  try {
    await apiClient.delete("/api/v1/notifications/device-token", { token });
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const };
  }
}

export async function checkDeviceTokenStatusAction(token: string) {
  try {
    const data = await apiClient.get<DeviceTokenStatusResponse>(
      `/api/v1/notifications/device-token/status?token=${encodeURIComponent(token)}`
    );
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const };
  }
}
```

---

### Step 3: `src/app/actions/auth.ts`

`logoutAction` 시그니처 변경:

```ts
export async function logoutAction(fcmToken?: string) {
  // ...
  await fetch(`${BASE_URL}/api/auth/tokens`, {
    method: "DELETE",
    headers: {
      Cookie: `access_token=${accessToken}; refresh_token=${refreshToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fcmToken }),
  });
  // ...
}
```

---

### Step 4: `src/components/LogoutButton.tsx`

`"use client"` 선언 후 `<form action>` → `<button onClick>` 전환.

```ts
"use client";
import { logoutAction } from "@/app/actions/auth";

export default function LogoutButton() {
  const handleLogout = async () => {
    const fcmToken = localStorage.getItem("fcmToken") ?? undefined;
    localStorage.removeItem("fcmToken");
    await logoutAction(fcmToken);
  };

  return <button onClick={handleLogout}>로그아웃</button>;
}
```

---

### Step 5: `src/components/Notifications/NotificationBell.tsx`

useEffect 교체 — `requestNotificationPermission` 제거, 조용한 초기화:

```
permission !== 'granted' → return (아무것도 안 함)
getCurrentToken() 호출
  null (getToken 실패 = 권한 취소됨)
    → localStorage에 이전 토큰 있으면 removeDeviceTokenAction(이전 토큰) + localStorage 제거
  토큰 === localStorage('fcmToken') → 아무것도 안 함 (토큰 동일)
  토큰 !== localStorage('fcmToken') → registerDeviceTokenAction(토큰) + localStorage 저장
```

---

### Step 6: `src/hooks/useFcmToken.ts` (신규)

반환값:
```ts
{
  alarmOn: boolean;
  loading: boolean;
  toggleOn: () => Promise<void>;
  toggleOff: () => Promise<void>;
}
```

마운트 시 초기 상태 결정:
```
permission !== 'granted' → alarmOn = false
getCurrentToken()
  → checkDeviceTokenStatusAction(token)
    registered: true  → alarmOn = true
    registered: false → alarmOn = false
```

`toggleOn`:
- `granted` → `getCurrentToken()` → `registerDeviceTokenAction` → localStorage 저장 → alarmOn = true
- `default` → `Notification.requestPermission()` → 허용이면 위와 동일, 무시면 변화 없음
- `denied` → 안내 토스트 표시

`toggleOff`:
- `getCurrentToken()` → `removeDeviceTokenAction` → `localStorage.removeItem('fcmToken')` → alarmOn = false

---

### Step 7: `src/components/Notifications/AlarmToggle.tsx` (신규)

`useFcmToken` 사용. 토글 스위치 UI + denied 시 안내 토스트.

```tsx
"use client";
export default function AlarmToggle() {
  const { alarmOn, loading, toggleOn, toggleOff } = useFcmToken();
  const handleToggle = () => alarmOn ? toggleOff() : toggleOn();
  // 토글 스위치 렌더링
}
```

---

### Step 8: `src/app/notifications/page.tsx`

헤더에 `<AlarmToggle />` 추가. page.tsx는 Server Component 유지.

```tsx
import AlarmToggle from "@/components/Notifications/AlarmToggle";

// 헤더 내부
<h1 className="...">알림</h1>
<AlarmToggle />
```

---

## 테스트 시나리오

### Phase 1
- `npx tsc --noEmit` 에러 없음
- `npm run lint` 에러 없음

### Phase 2
- permission: default → 앱 로드 시 팝업 없음, /notifications 토글 OFF
- 토글 ON 클릭 → 권한 팝업 → 허용 → 토글 ON 전환
- 권한 팝업 무시(닫기) → 토글 상태 변화 없음
- permission: granted + 등록됨 → /notifications 토글 ON
- permission: granted + 미등록 → /notifications 토글 OFF
- permission: denied → 토글 ON 클릭 → 안내 토스트, 팝업 없음
- 로그아웃 → 백엔드 device_tokens 해당 토큰 삭제 + localStorage 제거

### Phase 3
- localStorage 토큰 임의 변조 → 앱 로드 → 새 토큰으로 자동 교체
- 브라우저 권한 취소 → 앱 재방문 → 백엔드 토큰 삭제, /notifications 토글 OFF
