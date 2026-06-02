# Task 23: 그래프 노드 수 최적화

## 배경

현재 `app/page.tsx`는 `GET /api/v1/friends`로 전체 친구를 가져와 모두 노드로 렌더링한다.
친구가 많아질수록 그래프가 과밀해져 UX와 성능이 모두 저하된다.

circleSize 개념(Dunbar Number)에 맞게 현재 선택된 circleSize에 해당하는 친구들만 노드로 렌더링해야 한다.

## 현재 방식 vs 목표 방식

| | 현재 | 목표 |
|---|---|---|
| 친구 목록 API | `GET /api/v1/friends` (전체) | circleSize 파라미터 추가 |
| 노드 수 | 전체 친구 수 | circleSize 범위 내 친구만 |
| 엣지 | circleSize 기반 필터 | 동일 |

## 선행 조건

백엔드 `GET /api/v1/friends`에 circleSize 필터 파라미터 추가 필요.
또는 별도 엔드포인트 — PLAN 단계에서 백엔드와 협의.

## 고려사항

- circleSize 변경 시 노드 목록도 재조회 필요 (현재는 엣지만 재조회)
- 현재 뷰에 없는 친구를 Task 21(드래그 앤 드롭)로 임시 추가하는 흐름과 연계
- FriendActionPanel, Buzz 발신자 하이라이트 등 기존 기능이 전체 친구 목록에 의존하는 부분 점검 필요

## 검증

- circleSize 변경 시 해당 범위의 친구 노드만 렌더링
- 전체 친구 수 대비 렌더링 노드 수 감소 확인
- 기존 기능(패널, Buzz 하이라이트, suggestion) 정상 동작
- `npx tsc --noEmit` 에러 없음

## Result

<!-- 백엔드 API 변경 후 구현 -->
