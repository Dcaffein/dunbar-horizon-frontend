# Task 25: Buzz ANCHOR expansionValue 슬라이더

## 배경

Task 10에서 구현한 Buzz ANCHOR 모드의 수신 범위는 `EXPANSION_LEVELS` 상수 3단계(좁게 0.2 / 보통 0.5 / 넓게 0.8) 버튼으로 선택한다.
`expansionValue` state·API 연동은 이미 완료돼 있으므로, UI만 버튼 → 연속 슬라이더로 교체한다.

## 작업 범위

### 제거

```ts
const EXPANSION_LEVELS = [
  { label: "좁게", value: 0.2 },
  { label: "보통", value: 0.5 },
  { label: "넓게", value: 0.8 },
];
// 버튼 렌더링 블록 전체 (BuzzForm.tsx 141~155 라인)
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

`expansionLabel` 인라인 헬퍼:
- `0.1 ~ 0.3` → `"좁게"`
- `0.4 ~ 0.6` → `"보통"`
- `0.7 ~ 1.0` → `"넓게"`

### 기본값·범위

| 항목 | 값 |
|---|---|
| 기본값 | `0.5` (변경 없음) |
| 최솟값 | `0.1` |
| 최댓값 | `1.0` |
| step | `0.1` |
| API 전송 | `expansionValue` 그대로 (변경 없음) |

## 변경 파일

| 작업 | 파일 |
|---|---|
| 수정 | `src/components/Buzz/BuzzForm.tsx` |

## 고려사항

- 슬라이더 드래그 중에도 `onChange`가 연속 호출되지만 API는 제출 시점에만 호출 → 성능 문제 없음
- LABEL·MANUAL 모드 전환 후 ANCHOR 복귀 시 `expansionValue` state는 유지됨 (의도된 동작)
- "N명에게 발송" 실시간 피드백은 preview API 미존재로 스코프 외

## 검증

### Phase 1
- `npx tsc --noEmit` 에러 없음
- `npm run lint` 통과

### Phase 2
- ANCHOR 모드 선택 → 슬라이더 표시, 버튼 미노출
- 슬라이더 조작 → 레이블(좁게 / 보통 / 넓게) 실시간 변경
- 기본값 `0.5` → 초기 레이블 "보통"
- LABEL·MANUAL 모드 선택 시 슬라이더 미노출

### Phase 3
- LABEL 전환 후 ANCHOR 복귀 → 마지막 `expansionValue` 유지
- 최솟값(`0.1`) 경계: 레이블 "좁게", 최댓값(`1.0`) 경계: 레이블 "넓게"
- Buzz 제출 요청 payload에 `expansionValue` 포함 확인 (Network 탭)

## Result

<!-- 구현 완료 후 작성 -->
