# Frontend Architecture

## Tech Stack

- **Framework**: Next.js 16 (App Router) / React 19
- **Styling**: Tailwind CSS v4
- **Graph Visualization**: Cytoscape.js (`react-cytoscapejs`, `cytoscape-fcose`)
- **API Client**: `lib/springClient.ts` (Custom fetch wrapper)
- **Schema Validation**: Zod (폼 유효성 검증 및 데이터 타입 확인에 사용)

## Component Separation Strategy

- **Server Components (SC)**: `app/` 디렉토리 내의 `page.tsx`는 데이터 패칭(`springClient.get`)과 초기 레이아웃(Empty State 등) 렌더링만 담당한다.
- **Client Components (CC)**: 상태 관리가 필요한 UI(예: `SocialGraph`)는 `components/` 하위에 위치시키고 파일 최상단에 `"use client"`를 선언한다.
- **Custom Hooks**: Graph 데이터 포맷팅 등 복잡한 도메인 로직은 UI 컴포넌트에 두지 않고 `useGraphData.ts`와 같이 별도의 순수 TypeScript 훅으로 분리한다.

## File Colocation Strategy (응집도)

- 특정 UI 컴포넌트나 도메인에 종속된 파일들은 한 폴더 내에 함께 배치하여 응집도를 높인다.
- 예시: `components/Label/` 폴더 내에 `LabelManager.tsx`, `useLabel.ts`, `Label.mock.ts`, `Label.test.ts`를 모두 모아서 관리한다.

## Styling Rules

- 스타일은 오직 Tailwind CSS 유틸리티 클래스만 사용하며, 인라인 스타일(`style={{}}`) 사용은 지양한다.

## Next.js 필수 패턴 (어기면 런타임 버그)

### 1. 동적 라우트 params는 반드시 await

Next.js 15부터 동적 라우트의 `params`는 `Promise`다.
동기 접근(`params.id`)하면 `undefined` → 잘못된 분기 실행.

```ts
// page.tsx
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  ...
}
```

### 2. isRedirectError는 page와 Server Action 모두 re-throw

`apiClient`가 401을 받으면 `redirect("/login")`을 throw한다.
`catch {}` 블록이 이를 삼키면 redirect가 실행되지 않고 AsyncLocalStorage 컨텍스트가 오염된다.
Server Action뿐 아니라 **page 컴포넌트의 catch 블록**에서도 반드시 re-throw해야 한다.

```ts
import { isRedirectError } from "@/api/apiClient";

try {
  const data = await apiClient.get(...);
} catch (error) {
  if (isRedirectError(error)) throw error;  // 필수
  // 그 외 에러 처리
}
```
