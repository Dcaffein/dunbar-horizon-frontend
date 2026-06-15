# Task 34: FCM 알림 수신 핸들러 구현

## 배경

Task 32에서 FCM 토큰 라이프사이클(등록/삭제/로테이션)을 구현했으나,
실제 푸시 메시지가 도착했을 때 처리하는 로직이 없다.

- `onMessage`가 `firebase.ts`에서 export만 되어 있고 어디서도 연결되지 않음
- `public/firebase-messaging-sw.js`가 비어있음

## 요구사항

### 포그라운드 (앱 탭이 열려있고 현재 보고 있는 상태)
- `onMessage()` 핸들러를 연결해 도착한 메시지를 처리
- 인앱 토스트 또는 알림 UI로 표시 (브라우저 Notification API는 포그라운드에서 자동 발화 안 됨)
- 알림 목록 unread count 갱신

### 백그라운드 / 종료 (다른 탭, 최소화, 브라우저 종료)
- `public/firebase-messaging-sw.js`에 Firebase Messaging 초기화 코드 작성
- 서비스워커가 백그라운드 메시지를 받아 OS 네이티브 알림으로 표시
- 알림 클릭 시 앱으로 이동 (`notificationclick` 이벤트)

## 구현 범위

| 파일 | 변경 내용 |
|---|---|
| `public/firebase-messaging-sw.js` | Firebase compat SDK import + 앱 초기화 + 백그라운드 메시지 핸들러 |
| `src/lib/firebase.ts` | `setupForegroundHandler()` 추가 — `onMessage` 연결, 인앱 토스트 발화 |
| `src/app/layout.tsx` 또는 루트 Client Component | `useEffect`에서 `setupForegroundHandler()` 호출 (1회) |

## 주의사항

- `firebase-messaging-sw.js`는 서비스워커이므로 `process.env`에 접근 불가 → Firebase config 값을 직접 하드코딩 (클라이언트 키이므로 노출 무방)
- 포그라운드 핸들러는 `getFirebaseMessaging()`이 null이면(SSR) 등록하지 않음
- 서비스워커 버전 업데이트 시 캐시 무효화 고려

## 검증

### Phase 2
- **포그라운드**: 앱 탭 열린 상태에서 백엔드가 푸시 발송 → 인앱 토스트 표시
- **백그라운드**: 다른 탭 보는 중 → OS 네이티브 알림 팝업 표시
- **종료**: 브라우저 닫은 후 → OS 네이티브 알림 팝업 표시
- 알림 클릭 → 앱 해당 페이지로 이동

### Phase 3
- 포그라운드 핸들러 중복 등록 안 됨 (페이지 이동 후에도 1회만)
- 서비스워커 업데이트 시 이전 SW가 새 메시지를 잡지 않음
