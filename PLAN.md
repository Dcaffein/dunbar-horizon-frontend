# PLAN: Task 26-B — Flag 카드 리디자인 + 필터·앙코르 개선

## 1. 요구사항 분석

UI 검토 피드백 3가지를 반영한다.

1. **상태 필터 개선** — "종료 포함" 체크박스 → `모집중 / 모집마감 / 종료됨` 세그먼트 버튼
2. **앙코르 버튼 이동** — 목록 카드에서 제거, 상세 페이지에서 종료된 Flag에만 표시
3. **카드 UI 리디자인** — "알바 구인 게시판" 느낌 → 소셜/라이프스타일 카드 스타일

---

## 2. 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `src/components/Flag/FlagList.tsx` | 필터 세그먼트, 카드 전면 리디자인, 앙코르 버튼 제거 |
| `src/components/Flag/FlagDetail.tsx` | 앙코르 버튼 조건 → `isHost && isEnded` |

---

## 3. 변경 상세

### 필터 세그먼트 (FlagList.tsx)

**상태 분류 함수**
```
종료됨: endDateTime < now  (이벤트 자체가 끝남)
모집마감: status === "CLOSED" && endDateTime >= now  (모집은 닫혔지만 이벤트 아직)
모집중: 나머지 (status === "OPEN")
```
우선순위: 종료됨 > 모집마감 > 모집중 (mutually exclusive)

**필터 UI** — 탭 바 아래 별도 줄, 3개 pill 버튼
- 기본값: `"모집중"` 탭 진입 시마다 리셋
- 활성 pill: `bg-indigo-600 text-white rounded-full`
- 비활성: `text-gray-400`

### 앙코르 버튼 (FlagDetail.tsx)

```ts
const isEnded = isClosed || (!!flag.schedule?.endDateTime && new Date(flag.schedule.endDateTime) < new Date());
```
- `{isHost && isEnded && <Link>앙코르</Link>}` 로 변경

### 카드 리디자인 (FlagList.tsx — FlagCard)

**현재 → 변경**
- 레이아웃: `border-b px-4 py-4` → `mx-4 my-3 rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.07)] px-4 py-4`
- 상태 뱃지: 텍스트 배지 → 컬러 pill
  - 모집중: `bg-emerald-50 text-emerald-600`
  - 모집마감: `bg-amber-50 text-amber-600`
  - 종료됨: `bg-gray-100 text-gray-400`
- 제목: `text-sm font-semibold` → `text-base font-bold`
- description: `text-xs` → `text-sm text-gray-500`
- 메타(인원/날짜): 아이콘 없이 `·` 구분자로 한 줄
- 액션 버튼: 하단 구분선 위에 나란히, 더 작고 subtle하게
- 앙코르 버튼 행 완전 제거

**목록 컨테이너**
- `<ul>` 배경을 `bg-gray-50`으로 — 카드가 float하는 느낌

---

## 4. 테스트 시나리오

### Phase 1 — 정적 분석
- `npx tsc --noEmit` 에러 0건
- `npm run lint src/components/Flag/` 에러 0건

### Phase 2 — UI 확인
| 시나리오 | 기대 결과 |
|---|---|
| 목록 페이지 초기 | 필터 `모집중` 활성, shadow 카드 표시 |
| `모집마감` 필터 클릭 | 모집마감 Flag만 표시 (amber 뱃지) |
| `종료됨` 필터 클릭 | 종료된 Flag만 표시 (gray 뱃지) |
| 카드 디자인 | 라운드 카드, 그림자, 넉넉한 여백 |
| 목록 앙코르 버튼 | 미노출 (호스팅 탭 포함) |
| 상세 — 종료된 Flag | 앙코르 버튼 표시 |
| 상세 — 모집중 Flag | 앙코르 버튼 미표시 |
