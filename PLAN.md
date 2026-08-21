# PLAN: Task 43 — 백엔드 실패 사유 노출

배경·범위 근거는 `harness/tasks/43-expose-backend-failure-reason.md` 참고.

## 1. 작업 성격

**기계적이고 반복적인 변경 29곳.** 새 로직도 새 타입도 없다.

```ts
// before
return { success: false as const, message: "Flag 삭제에 실패했습니다." };

// after — 파일 안의 다른 액션들과 같은 형태로 통일
const message = error instanceof Error ? error.message : "Flag 삭제에 실패했습니다.";
return { success: false as const, message };
```

기존 문구는 **fallback으로 남긴다.** `ApiError`가 아닌 무언가가 올라오는 경우를 위한
마지막 방어선이다(Task 42로 그럴 일이 거의 없어졌지만 제거할 이유도 없다).

호출하는 컴포넌트는 이미 `result.message ?? "기본 문구"`로 받고 있어 **무변경**이다.

## 2. 대상 29곳

| 파일 | 총 | 조회 | 변경 |
|---|---|---|---|
| `buzz.ts` | 7 | 3 | 4 |
| `flag.ts` | 8 | 1 | 7 |
| `label.ts` | 3 | 0 | 3 |
| `profile.ts` | 3 | 1 | 2 |
| `friendRequest.ts` | 2 | 2 | 0 |
| `friendship.ts` | 2 | 2 | 0 |
| `notification.ts` | 2 | 1 | 1 |
| `social.ts` | 2 | 2 | 0 |

이미 통과 형태인 곳(`flag.ts` 13, `friendRequest.ts` 5, `buzz.ts` 2)과 형태가 같아진다.

**조회 실패 시 빈 배열을 반환하는 15곳은 건드리지 않는다** — Task 44 소관이고,
이 태스크의 grep 패턴(`message:`가 바로 뒤에 오는 형태)과도 겹치지 않는다.

## 3. 구현

파일별로 순서대로 처리한다. 각 파일마다:

1. `return { success: false as const, message: "..." };` 를 찾는다
2. 직전에 `const message = error instanceof Error ? error.message : "<원래 문구>";` 추가
3. `return { success: false as const, message };` 로 교체
4. `isRedirectError(error)` 재던지기는 **그대로 둔다**

`profile.ts`·`label.ts`처럼 `data`와 `message`를 함께 반환하는 줄은
이번 대상이 아니다(Task 44). 패턴이 다르므로 자동 치환 시 주의한다.

## 4. 검증

### Phase 1 — 정적 분석

- `npx tsc --noEmit`, `npm run lint` (총계가 작업 전과 동일해야 한다)
- 남은 고정 문구 형태가 **0건**이어야 한다

```bash
grep -rn 'return { success: false as const, message: "' src/app/actions | wc -l   # 29 → 0
grep -rn 'error instanceof Error ? error.message' src/app/actions | wc -l         # 20 → 49
```

### Phase 2 — 도메인별 실패 문구 육안 확인

기준 계정: 이수환 / leesuhwan@test.com / String123! (user_id=4)

**리스크가 "아직 못 본 4xx 문구가 어색할 수 있다"이므로, 실제 실패를 일으켜 눈으로 본다.**
스텁 서버로 도메인별 실패를 주입하는 편이 빠르다(Task 42에서 만든 것 재사용).

| 도메인 | 일으킬 실패 |
|---|---|
| Flag | 종료된 Flag에 참여 시도 / 남의 Flag 삭제 시도 |
| Buzz | 남의 Buzz 삭제 시도 |
| Label | 중복 이름 생성 / 없는 라벨 삭제 |
| Profile | 잘못된 닉네임 저장 |
| Notification | 없는 알림 읽음 처리 |

각 문구가 **사람이 읽을 수 있는 한국어**인지 확인한다.
내부 용어나 영문이 섞여 나오면 그 지점만 고정 문구를 유지하고 기록한다.

### Phase 3 — Task 42 불변식 유지 확인

- **백엔드 중지 상태**에서 위 액션들을 수행 → 여전히 `"네트워크 연결을 확인해 주세요."`
  (`fetch failed`가 29곳으로 퍼지지 않았음을 확인 — 이 태스크의 핵심 안전 조건)
- **5xx 주입** → `"일시적인 오류가 발생했습니다..."`
- **401** → `/login` 리다이렉트 정상

Phase별 커밋. **push는 하지 않는다.**

## 5. 리스크

| 리스크 | 대응 |
|---|---|
| 아직 못 본 4xx 문구가 어색함 | Phase 2에서 도메인별 육안 확인. 문제 있으면 그 지점만 고정 문구 유지 |
| 조회 실패 15곳을 실수로 건드림 | 패턴이 다르므로 grep으로 분리. Phase 1에서 건수 대조 |
| `fetch failed`가 29곳으로 확산 | Task 42의 불변식이 막는다. Phase 3에서 실측 |

## 6. 브랜치

Task 42를 main에 병합한 뒤 `agent/task-43-expose-backend-failure-reason`으로 분기한다.
42의 불변식이 전제이므로 42 없이는 착수하지 않는다.
