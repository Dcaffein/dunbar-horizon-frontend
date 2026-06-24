# Task 37: Memorial 페이지 병렬 fetch 최적화

## 배경

`app/flags/[id]/memorial/page.tsx`에서 초기 데이터 로딩이 3라운드 순차 실행된다.
배포 환경에서 Vercel ↔ 백엔드 간 레이턴시가 라운드마다 누적되어 Memorial 진입이 느리다.

---

## 현재 구조 (3라운드)

```
Round 1: GET /api/v1/users/me
Round 2: GET /api/v1/flags/{id}           ← 독립적이나 순차
Round 3: GET /api/v1/flags/{id}/memorials ← 독립적이나 순차
```

세 API 모두 서로 의존성이 없다.

---

## 변경 방향

3개를 단일 `Promise.all`로 묶어 1라운드에 처리한다.  
플래그 종료 여부(`isEnded`) 체크와 권한 계산은 결과를 받은 뒤 수행한다.

```ts
const [profile, flagResult, memorialsResult] = await Promise.all([
  apiClient.get<{ id: number }>("/api/v1/users/me").catch(() => null),
  getFlagDetailAction(id),
  getMemorialsAction(id),
]);
```

`isEnded` 조건 불충족 시 `redirect`는 `Promise.all` 이후 처리.

---

## 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `src/app/flags/[id]/memorial/page.tsx` | 3개의 순차 try-catch 블록 → 단일 `Promise.all` 통합 |

---

## 검증

### Phase 1
- `npx tsc --noEmit` 에러 없음
- `npm run lint` 에러 없음

### Phase 2
- Memorial 페이지 진입 시 메모리얼 목록, 작성 폼 정상 렌더링
- 종료되지 않은 Flag의 Memorial 진입 시 `/flags/{id}`로 정상 리다이렉트
- 호스트/참여자 권한에 따른 UI 분기 정상 동작

### Phase 3
- locked 상태(메모리얼 잠금)에서 작성 폼 비활성화 확인
- /users/me 실패 시(비인증 등) 리다이렉트 정상 처리
