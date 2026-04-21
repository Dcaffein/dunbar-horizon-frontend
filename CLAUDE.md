# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Harness — 작업 지침 문서

`harness/` 폴더에 이 프로젝트의 작업 규칙이 정의되어 있다. 모든 작업은 아래 문서를 반드시 따른다.

| 문서 | 역할 |
|---|---|
| `harness/AGENT_WORKFLOW.md` | **최상위 지침** — 작업 프로세스, 코딩 컨벤션, Mock 원칙 |
| `harness/ARCHITECTURE.md` | 컴포넌트 분리 전략, 파일 배치(colocation) 규칙, 스타일 규칙 |
| `harness/DOMAIN_TERMS.md` | 도메인 용어 사전 — 코드 작성 시 반드시 준수해야 할 변수명/타입명 |
| `harness/TESTING_RULES.md` | 3단계 검증 프로토콜 (Phase 1: 정적분석 → Phase 2: UI/State → Phase 3: Edge Case) |
| `harness/tasks/` | 개별 기능 태스크 명세 파일 |

### 작업 시작 전 필수 절차 (AGENT_WORKFLOW 요약)

1. 코드 수정 전 브랜치 루트에 `PLAN.md`를 작성한다.
   - 요구사항 분석 및 작업 범위
   - 생성/수정할 파일 목록 (Mock 파일 포함)
   - `harness/TESTING_RULES.md` 기반의 단계별 테스트 시나리오
2. 사용자의 명시적 승인을 받은 후에만 코드를 작성한다.
3. 승인 후 `agent/기능-이름` 브랜치를 생성하여 이동한 뒤 작업한다.

### Mock 원칙

- 사용자의 명시적 지시가 없는 한 `springClient`를 직접 호출하지 않는다.
- Mock 파일은 컴포넌트 폴더 안에 함께 배치한다 (예: `components/Label/Label.mock.ts`).
- Mock 데이터는 한국어 기반의 실감 나는 예시로 구성한다.

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm run lint     # Run ESLint
```

There are no test commands — no test suite is configured.

## Environment

Copy `.env` and set `NEXT_PUBLIC_API_URL` to point to the Spring Boot backend:

```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

The default fallback is `http://localhost:8080` (see `lib/constants.ts`).

## Architecture

### Data Flow

```
app/page.tsx (Server Component)
  └─ springClient.get("/api/v1/friends")   ← JWT cookie forwarded server-side
    └─ <SocialGraph friends={...} />       ← client boundary

components/socialGraph/index.tsx (Client Component)
  ├─ calls Server Actions in app/actions/social.ts
  ├─ useGraphData() → converts friends[] + edges[] → Cytoscape ElementDefinition[]
  └─ <CytoscapeWrapper />  (dynamic import, ssr: false)
       ├─ useEffect[elements] → batch add/remove + run layout
       ├─ useEffect[stylesheet] → style-only update, no re-layout
       └─ useEffect[layout] → re-run physics engine only
```

### Server Actions

All API calls go through Server Actions (`"use server"`). The JWT `access_token` cookie is only accessible server-side — **never call the Spring API from client-side code**. The `springClient` in `lib/springClient.ts` reads cookies, forwards them as a `Cookie` header, and automatically `redirect("/login")` on 401.

When catching errors in Server Actions, always re-throw redirect errors:
```ts
if (isRedirectError(error)) throw error;
```

### Authentication

- Login sets `access_token` + `refresh_token` cookies via `Set-Cookie` header parsing (`parseSetCookie` in `app/actions/auth.ts`).
- All authenticated requests pass only `access_token` in the `Cookie` header.
- 401 anywhere in `springClient` triggers `redirect("/login")`.

### Graph Visualization

Three layout themes are defined in `components/socialGraph/layout.ts`, each with distinct fcose physics parameters:

| Theme | Key mechanic |
|---|---|
| `connectivity` | Jaccard similarity → shorter `idealEdgeLength` for nodes with many common neighbors |
| `intimacy` | `intimacy` score (0–1) → shorter edges + thicker strokes for high-intimacy pairs |
| `interest` | `myInterestScore` (0–1) → larger node size + stronger `nodeRepulsion` for high-interest friends |

`CytoscapeWrapper` separates three independent `useEffect`s intentionally:
- `[elements]` — add/remove nodes and edges, run full layout
- `[stylesheet]` — theme style switch without touching positions
- `[layout]` — physics re-run when layout options change without data change

The `isLazyLoadUpdate` flag in `CytoscapeWrapper` detects one-hop edge additions (no elements removed) and disables `fit` to preserve the current zoom/pan state.

### File Colocation

도메인에 종속된 파일은 해당 컴포넌트 폴더에 함께 배치한다. 예:

```
components/Label/
  ├─ LabelManager.tsx   # UI 컴포넌트
  ├─ useLabel.ts        # 비즈니스 로직 훅
  ├─ Label.mock.ts      # Mock 데이터
  └─ Label.test.ts      # 테스트
```

### Path Alias

`@/*` maps to the project root (see `tsconfig.json`). Use `@/lib/...`, `@/components/...`, `@/app/...`, `@/types/...`.

### Domain Terms

코드 작성 시 `harness/DOMAIN_TERMS.md`의 변수명을 반드시 준수한다. 주요 타입:

- `FriendshipDetail` — 노드 렌더링의 기본 데이터 모델
- `NetworkFriendEdge` — 친구 간 관계(엣지) 데이터 모델
- `intimacy` — 친밀도 (0–1), `interest` — 내 관심도 (`myInterestScore` 기반)
- `label` — 노드 표시 텍스트 (`friendAlias` 우선, 없으면 `friendNickname`)
