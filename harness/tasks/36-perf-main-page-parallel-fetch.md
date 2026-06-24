# Task 36: 메인 페이지 병렬 fetch 최적화

## 배경

`app/page.tsx`(메인 소셜 그래프 화면)에서 초기 데이터 로딩이 3라운드 순차 실행된다.
배포 환경에서 Vercel ↔ 백엔드 간 레이턴시가 라운드마다 누적되어 초기 진입이 느리다.

---

## 현재 구조 (3라운드)

```
Round 1: GET /api/v1/friends
Round 2: GET /api/v1/labels               ← 독립적이나 순차
Round 3: GET /notifications/unread-count
        + GET /buzzes/senders/unread      ← 두 개는 병렬, 하지만 Round 2 완료 후
```

4개 API 모두 서로 의존성이 없다.

---

## 변경 방향

4개를 단일 `Promise.all`로 묶어 1라운드에 처리한다.

```ts
const [friendsData, labelsResult, unreadResult, buzzSendersResult] = await Promise.all([
  apiClient.get<FriendshipDetail[]>("/api/v1/friends").catch(() => []),
  getLabelsAction(),
  getUnreadCountAction(),
  getUnreadSendersAction(),
]);
```

---

## 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `src/app/page.tsx` | 3개의 순차 try-catch 블록 → 단일 `Promise.all` 통합 |

---

## 검증

### Phase 1
- `npx tsc --noEmit` 에러 없음
- `npm run lint` 에러 없음

### Phase 2
- 메인 페이지 진입 시 소셜 그래프, 알림 배지, Buzz 발신자 하이라이트 모두 정상 렌더링
- 친구가 없는 경우 빈 상태 화면 정상 표시
- 레이블 탭 정상 동작

### Phase 3
- 개별 API 하나가 실패해도 나머지 데이터는 정상 렌더링 (각 항목 독립 catch 처리)
