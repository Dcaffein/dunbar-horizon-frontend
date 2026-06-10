# PLAN: Task 25 — Buzz ANCHOR expansionValue 슬라이더

## 현황

`BuzzForm.tsx`에 `expansionValue` state와 API 요청 포함은 이미 구현됨.
UI만 3단계 버튼 → `<input type="range">` 슬라이더로 교체.

## 변경 파일

| 작업 | 파일 |
|---|---|
| 수정 | `src/components/Buzz/BuzzForm.tsx` — 버튼 → 슬라이더 교체 |

## 구현 상세

### 제거
```tsx
const EXPANSION_LEVELS = [
  { label: "좁게", value: 0.2 },
  { label: "보통", value: 0.5 },
  { label: "넓게", value: 0.8 },
];
// 버튼 렌더링 블록 전체
```

### 교체
```tsx
<div>
  <label className="text-xs font-bold text-gray-500 mb-1.5 block">
    수신 범위 — {expansionLabel(expansionValue)}
  </label>
  <input
    type="range"
    min={0.1}
    max={1.0}
    step={0.1}
    value={expansionValue}
    onChange={(e) => setExpansionValue(Number(e.target.value))}
    className="w-full accent-orange-500"
  />
  <div className="flex justify-between text-xs text-gray-400 mt-1">
    <span>좁게</span>
    <span>넓게</span>
  </div>
</div>
```

`expansionLabel` 헬퍼 (인라인):
- 0.1 ~ 0.3 → "좁게"
- 0.4 ~ 0.6 → "보통"
- 0.7 ~ 1.0 → "넓게"

### 기본값 및 범위
- 기본값: `0.5` (변경 없음)
- 범위: `0.1 ~ 1.0`, step `0.1`
- API 전송값: `expansionValue` 그대로 (변경 없음)

## 스코프 외
- "N명에게 발송" 실시간 피드백 (preview API 미존재)

## 테스트 시나리오

### Phase 1
- `npx tsc --noEmit` 에러 없음
- `npm run lint` 통과

### Phase 2
- ANCHOR 모드 선택 → 슬라이더 표시
- 슬라이더 조작 → 레이블(좁게/보통/넓게) 변경
- 다른 수신자 타입 선택 시 슬라이더 미노출

### Phase 3
- LABEL/MANUAL 모드 전환 후 ANCHOR 복귀 → expansionValue 유지
- 최솟값(0.1) / 최댓값(1.0) 경계 동작
