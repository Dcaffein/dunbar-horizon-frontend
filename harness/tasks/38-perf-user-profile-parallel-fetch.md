# Task 38: 유저 프로필 페이지 병렬 fetch 최적화

## 배경

`app/users/[userId]/page.tsx`에서 친구 프로필 조회 시 2라운드 순차 실행된다.
`getFriendProfileAction`과 `getLabelsAction`은 서로 독립적이나 순차 실행된다.

---

## 현재 구조 (2라운드)

```
Round 1: GET /api/v1/friends/{userId}     ← 친구 여부 확인
Round 2: GET /api/v1/labels               ← 친구인 경우만, 독립적이나 순차
         (또는 GET /api/v1/social/{userId} ← 친구 아닌 경우)
```

친구인 경우가 대부분이며, 두 요청은 의존성이 없다.

---

## 변경 방향

`getFriendProfileAction`과 `getLabelsAction`을 동시에 실행한다.  
친구가 아닌 경우 레이블 결과는 버린다.  
`getSocialProfileAction`은 친구 여부 확인 후 fallback으로 실행하므로 순차가 불가피하다.

```ts
const [friendResult, labelsResult] = await Promise.all([
  getFriendProfileAction(userId),
  getLabelsAction(),
]);

if (friendResult.success && friendResult.data) {
  const myLabels = (labelsResult.data ?? [])
    .filter((l) => l.members?.some((m) => m.id === userId));
  return <FriendProfile profile={friendResult.data} userId={userId} myLabels={myLabels} />;
}

// 친구 아닌 경우 — 불가피한 2번째 라운드
const socialResult = await getSocialProfileAction(userId);
...
```

---

## 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `src/app/users/[userId]/page.tsx` | `getFriendProfileAction` + `getLabelsAction` 병렬화 |

---

## 검증

### Phase 1
- `npx tsc --noEmit` 에러 없음
- `npm run lint` 에러 없음

### Phase 2
- 친구 프로필 진입 시 레이블 표시 정상 동작
- 친구가 아닌 유저 프로필 진입 시 PublicProfile 정상 렌더링
- 레이블 필터링(해당 유저가 멤버인 레이블만) 정상 동작

### Phase 3
- `getLabelsAction` 실패 시 레이블 없이 FriendProfile 정상 렌더링
- 존재하지 않는 userId 접근 시 `/`로 리다이렉트
