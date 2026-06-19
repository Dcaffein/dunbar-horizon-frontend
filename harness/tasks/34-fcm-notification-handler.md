# Task 34: FCM 포그라운드 알림 핸들러 구현

## 배경

Task 32에서 FCM 토큰 라이프사이클(등록/삭제/로테이션)을 구현했으나,
실제 푸시 메시지가 도착했을 때 처리하는 로직이 없다.

- `onMessage`가 `firebase.ts`에서 export만 되어 있고 어디서도 연결되지 않음

## 범위 결정

백그라운드(서비스워커) 알림은 이번 구현에서 제외한다.

**이유:** 현재 웹 앱 기준으로 OS 팝업 알림은 과하다. 앱 탭이 열려있는 상태에서의
인앱 토스트가 웹 서비스에 자연스러운 방식이다. 모바일 배포(Capacitor 등)를
결정할 때 서비스워커 핸들러를 추가한다.

`public/firebase-messaging-sw.js`는 현 상태(빈 파일) 유지 — FCM 토큰 등록에는
서비스워커 파일이 존재하기만 하면 되므로 문제없다.

## 요구사항

### 포그라운드 (앱 탭이 열려있고 현재 보고 있는 상태)

- `onMessage()` 핸들러를 연결해 도착한 메시지를 처리
- 우상단 인앱 토스트로 표시 (제목 + 본문)
- 5초 후 자동 닫힘, X 버튼으로 수동 닫기 가능
- 브라우저 Notification API는 포그라운드에서 자동 발화 안 되므로 인앱 UI로 대체

## 구현 범위

| 파일 | 변경 내용 |
|---|---|
| `src/lib/firebase.ts` | `setupForegroundHandler(cb)` 추가 — `onMessage` 연결, unsubscribe 반환 |
| `src/components/FcmInitializer.tsx` | NEW — 핸들러 등록 + 인앱 토스트 UI |
| `src/app/layout.tsx` | `<FcmInitializer />` 추가 |

## 주의사항

- `setupForegroundHandler`는 `getFirebaseMessaging()`이 null이면(SSR) no-op 반환
- `useEffect` cleanup으로 unsubscribe → React StrictMode 이중 마운트 안전
- `FcmInitializer`는 layout에 한 번만 렌더되므로 핸들러 중복 등록 없음

## 검증

### Phase 2
- 앱 탭 열린 상태에서 백엔드가 푸시 발송 → 우상단 토스트 표시
- 5초 후 자동 닫힘
- X 버튼으로 수동 닫기

### Phase 3
- 페이지 이동 후에도 핸들러 중복 등록 안 됨
- 알림 권한 미허용 사용자에게 핸들러 등록 시도 없음
