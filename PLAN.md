# PLAN: root 디렉토리 정리 (src/ 단일 구조로 통합)

## 배경

`git reset --hard 8026633` 으로 인해 old root-level 파일들(`app/`, `components/`, `lib/`, `types/`)이 복원되어 `src/`와 이중 구조가 됐다.
Next.js는 root `app/`을 우선 서빙하기 때문에 `src/`의 신규 코드가 실제로 반영되지 않는 문제가 있다.

## 목표

- root-level 구 파일 삭제
- 미추적(untracked) `src/` 파일 전부 git에 추가
- `tsconfig.json`의 `@/*` 경로를 `./src/*`로 수정
- 이후 `src/`가 유일한 소스 루트로 동작

---

## 1. 삭제할 root-level 파일/디렉토리

| 경로 | 비고 |
|---|---|
| `app/` | `src/app/`으로 이전 완료 |
| `components/` | `src/components/`으로 이전 완료 |
| `lib/` | `src/lib/`으로 이전 완료 |
| `types/` | `src/types/`으로 이전 완료 |
| `proxy.ts` | 사용 안 함 |

## 2. git add 할 untracked src/ 파일

| 경로 |
|---|
| `src/api/` |
| `src/app/` |
| `src/components/LogoutButton.tsx` |
| `src/components/socialGraph/CytoscapeWrapper.tsx` |
| `src/components/socialGraph/styles.ts` |
| `src/lib/` |
| `src/types/` |

## 3. tsconfig.json 수정

```json
// Before
"paths": { "@/*": ["./*"] }

// After
"paths": { "@/*": ["./src/*"] }
```

---

## 검증

1. `npx tsc --noEmit` — 에러 없음
2. `npm run lint` — 신규 에러 없음
3. dev 서버 재시작 후 `http://localhost:3000/` 접속 → 빌드 에러 없이 페이지 로드
4. 라벨 관리 탭 정상 동작 확인

---

## 브랜치

`agent/cleanup-root-structure` → `feature/api-harness-setup` 머지
