# Task 33: Chrome 메인 그래프 레이아웃 문제

## 현상

Chrome 브라우저에서 메인 페이지(`/`) 접속 시 소셜 그래프 영역이 화면을 꽉 채우지 않고 잘려서 작게 보이는 현상 발생.
Edge 등 다른 브라우저에서는 정상 표시.

## 재현 방법

1. Chrome에서 로그인 후 메인 페이지(`/`) 진입
2. 소셜 그래프 컨테이너(`<section>`)가 화면 전체를 채우지 않고 일부만 렌더링됨

## 추정 원인

- `CytoscapeWrapper`의 `height` 계산이 Chrome의 viewport 처리 방식과 맞지 않을 가능성
- `h-screen` / `flex-1` 조합에서 Chrome과 Edge 간 rendering 차이
- Cytoscape의 `fit()` 또는 초기 레이아웃 실행 시점에서 컨테이너 크기를 잘못 읽는 경우

## 관련 파일

- `src/app/page.tsx` — 그래프 컨테이너 레이아웃 (`h-screen flex flex-col`)
- `src/components/socialGraph/CytoscapeWrapper.tsx` — Cytoscape 초기화 및 fit 로직

## 검증 기준

- Chrome에서 메인 페이지 로드 시 그래프가 `<section>` 영역을 꽉 채워 렌더링됨
- Edge, Chrome 동일하게 보임
