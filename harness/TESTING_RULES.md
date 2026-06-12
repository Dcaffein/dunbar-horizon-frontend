# Testing & Verification Protocol

에이전트는 코드 작성을 완료했다고 보고하기 전에 반드시 아래의 3단계 검증 절차를 스스로 수행하고 결과를 확인해야 한다.

## 단계별 세이브 포인트 (Commit) 정책

- 롤백(Rollback)을 안전하게 수행하기 위해, **각 Phase(1, 2, 3)의 테스트를 통과할 때마다 반드시 즉시 `git commit`을 실행하여 세이브 포인트를 생성하라.**
- 커밋 메시지 예시: `test(phase1): Validation 및 Unit 테스트 통과`

---

## Phase 1: 정적 분석 및 단위 검증 (Validation & Unit)

- `npm run lint`를 실행하여 ESLint 경고나 에러가 없는지 최우선으로 확인한다.
- `npx tsc --noEmit`을 실행하여 TypeScript 타입 에러가 발생하지 않는지 검증한다.
- `hooks/` 또는 `lib/`에 포함된 비즈니스 로직을 수정/추가했다면 상응하는 `.test.ts` 파일을 작성하고 테스트를 통과시킨다.
- 성공 시 1차 커밋 진행

## 테스트 데이터

테스트 및 스크린샷 캡처 시 반드시 아래 fixtures를 사용한다.

| 파일 | 내용 |
|---|---|
| `harness/fixtures/users.md` | 전체 유저 목록 (id, email, nickname) |
| `harness/fixtures/friendships.md` | 친구 관계 전체 + 이수환(id=4) 친구 목록 + 2-hop 시나리오 |

- **기본 테스트 계정**: 이수환 / lsh@test.com / String123! (user_id=4, 친구 56명)
- Mock 데이터를 새로 만들지 말고 fixtures의 실제 유저 정보를 사용한다.

---

## Phase 2: UI 및 상태 검증 (UI & State)

- 컴포넌트가 화면에 정상적으로 렌더링되는지 확인한다.
- 버튼 클릭, 폼 제출 등의 이벤트가 발생했을 때 Mock 데이터 기반의 상태(State)가 즉각적으로 업데이트되는지 검증한다.
- Playwright 스크린샷은 반드시 `harness/verify/` 폴더에 저장한다. 파일명 규칙: `verify-{taskNo}-{stepNo}-{description}.png` (예: `verify-09-01-header.png`)
- **[성공 시] ➔ 2차 커밋 진행**

## Phase 3: 예외 상황 (Edge Cases)

- 데이터가 비어있을 때(Empty State), 혹은 잘못된 값이 입력되었을 때의 방어 로직이 동작하는지 점검한다.
- **[성공 시] ➔ 최종 커밋 및 작업 완료 보고**

---

## ⚠️ 롤백(Rollback) 정책 (CRITICAL)

- 작업을 진행하다가 테스트를 통과하지 못하는 치명적인 에러가 발생하면, 무리하게 전체 코드 구조를 임의로 뜯어고치지 마라.
- 에러 로그를 분석하여 원인이 복잡하거나 원본 설계가 훼손될 위험이 있다면, **가장 최근에 테스트를 통과했던 Phase의 커밋 지점(세이브 포인트)으로 즉시 `git reset --hard` 또는 `git checkout`하여 롤백한다.**
- 롤백 후 사용자에게 상황을 보고하고 다시 전략을 수립한다.
