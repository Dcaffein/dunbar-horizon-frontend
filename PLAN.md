# PLAN: Task 44 — 화면 상태 정합성

배경·문제 정의는 `harness/tasks/44-screen-state-integrity.md` 참고.

## 1. 지금 없는 것부터

착수 전 조사에서 드러난 사실 — **공용 장치가 하나도 없다.**

| 장치 | 현재 |
|---|---|
| 빈 상태 표시 | `EmptyState`가 [FriendRequestPage.tsx:305](src/components/FriendRequest/FriendRequestPage.tsx#L305)의 **지역 함수**. 다른 화면은 각자 `<p>`로 직접 그림 |
| 토스트 | `showToast`가 [FlagDetail.tsx:111](src/components/Flag/FlagDetail.tsx#L111)의 **지역 함수**. `socialGraph`에 또 하나 |
| 실패 표시 | **없음** |
| 재조회 | `router.refresh()`를 4곳에서 각자 호출 |

그래서 Phase 1이 "장치 만들기"다. 이게 없으면 15곳을 고치면서 실패 UI를 15번 새로 그리게 된다.

## 2. 설계

### 액션 반환 타입 — 추가만 한다

Task 42가 `message` 하위 호환으로 안전을 확보한 것과 같은 방식.

```ts
// before
catch { return { success: false as const, data: [] as FlagResult[] }; }

// after — failure 필드만 추가. data 는 그대로 빈 배열
catch (error) {
  if (isRedirectError(error)) throw error;
  const failure = toFailure(error);          // { kind, status? }
  return { success: false as const, data: [] as FlagResult[], failure };
}
```

**기존 소비자는 `data`만 보므로 한 곳도 깨지지 않는다.** 화면이 준비된 순서대로
`failure`를 읽어 나가면 된다. 15곳을 한 번에 화면까지 연결하지 않아도 된다.

### 공용 컴포넌트 두 개

```
components/common/EmptyState.tsx     FriendRequestPage 의 지역 함수를 승격
components/common/FailureState.tsx   실패 사유 + 재시도 버튼
```

`FailureState`는 `failure.kind`로 문구와 재시도 노출을 정한다.

| `kind` | 문구 | 재시도 |
|---|---|---|
| `network` · `timeout` | 연결을 확인해 주세요 | ○ |
| `http` · `parse` | `message` (이미 안전한 문장) | ○ |

재시도는 `router.refresh()`로 통일한다. 이미 4곳에서 쓰는 방식이라 새 개념이 아니다.

### 부분 실패 — 주 데이터인가 부수 데이터인가

[app/page.tsx](src/app/page.tsx)가 `Promise.all` + 개별 `.catch()`로 셋을 병렬 조회한다.
전부 같게 다루면 안 된다. **그 조회가 화면의 주 데이터인지로 가른다.**

| 조회 | 성격 | 실패 시 |
|---|---|---|
| `친구 목록` | **주 데이터** — 없으면 그래프가 무의미 | 실패 화면 + 재시도 |
| `라벨` | 부수 | 조용히 빈 목록. 로그만 |
| `안읽은 알림 수` | 부수 | 조용히 0 |

이 기준을 15곳 전부에 적용한다.

## 3. 대상 15곳과 배치

| 위치 | 액션 | 성격 | 실패 시 |
|---|---|---|---|
| flag.ts:21 | `getHostingFlagsAction` | 주 | Flag 목록에 `FailureState` |
| flag.ts:31 | `getParticipatingFlagsAction` | 주 | 〃 |
| flag.ts:54 | `getFriendFlagsAction` | 주 | 〃 (둘러보기 탭) |
| flag.ts:163 | `getReceivedInvitationsAction` | 주 | 초대 목록에 `FailureState` |
| flag.ts:173 | `getSentInvitationsAction` | 주 | 〃 |
| flag.ts:254 | `getMemorialsAction` | 주 | 메모리얼 화면에 `FailureState` |
| flag.ts:297 | `getCommentsAction` | 주(섹션) | 댓글 섹션 인라인 실패 + 재시도 |
| buzz.ts:21 | `getUnreadSendersAction` | 부수 | 조용히 빈 목록 |
| buzz.ts:140 | `getLabelsAction` | 부수 | 〃 |
| label.ts:15 | `getLabelsAction` | 부수(메인) / 주(라벨 관리) | 화면별로 다름 — 아래 참고 |
| label.ts:27 | `createLabelAction` | 변경 요청 | `data: null` 유지, `message`는 이미 통과 |
| notification.ts:15 | `getUnreadCountAction` | 부수 | 조용히 0 |
| social.ts:102 | `getOneHopMutualFriendEdgesAction` | 부수 | 조용히 빈 배열 (그래프 확장 실패) |
| flag.ts:242 | `getMemorialCountAction` | 부수 | 조용히 0 |
| flag.ts:44 | `getUserRecentFlagsAction` | 부수(프로필 섹션) | 섹션에 작은 실패 표시 |

`label.ts:15`는 같은 액션이 메인(부수)과 라벨 관리(주)에서 쓰인다.
**액션이 아니라 화면이 판단하게 한다** — 액션은 `failure`를 실어 보내고,
쓰는 쪽이 무시할지 표시할지 정한다.

## 4. Phase

### Phase 1 — 장치

- `toFailure(error)` 헬퍼 (`apiClient` 근처)
- `components/common/EmptyState.tsx` — 기존 지역 함수 승격, `FriendRequestPage` 교체
- `components/common/FailureState.tsx` — 신규
- 조회 액션 15곳에 `failure` 필드 추가 **(소비하지 않음)**

**이 Phase는 화면 동작이 하나도 바뀌지 않는다.** 검증도 그걸 확인한다.

### Phase 2 — A 적용 (조회 실패 표시)

위 표대로 화면을 연결한다. Flag 목록 → 초대 목록 → 메모리얼 → 댓글 순.
부수 데이터는 그대로 둔다(변경 없음).

### Phase 3 — B 적용 (409 재조회)

**선행 확인이 끝난 뒤에 착수한다.** 409를 내는 엔드포인트를 나열하고
각각이 "재조회하면 해결"인지 판정한다. Task 41·43에서 쓴 방식대로
실제 응답을 전수 수집해서 판단한다.

- [FlagDetail.tsx](src/components/Flag/FlagDetail.tsx) 참여 취소·참여하기
- [FlagInvitationList.tsx](src/components/Flag/FlagInvitationList.tsx) 초대 수락·거절

## 5. 검증

### Phase 1

- `npx tsc --noEmit`, `npm run lint` (총계 15 problems 유지)
- **화면 동작 무변경** — 전 도메인 스모크에서 지금과 동일하게 보일 것
- `FriendRequestPage`의 빈 상태가 승격 전과 동일하게 보일 것

### Phase 2 — 핵심 대조

Task 42에서 만든 스텁으로 조회 실패를 주입한다.
**"실패"와 "진짜 빈 데이터"가 다르게 보이는지가 이 태스크의 전부다.**

| 상황 | 기대 |
|---|---|
| 조회 실패 (스텁 5xx) | 실패 문구 + 재시도 버튼 |
| 조회 실패 (스텁 연결 끊김) | "연결을 확인해 주세요" + 재시도 |
| **재시도 클릭 → 스텁 정상화** | 데이터가 채워짐 |
| **진짜 빈 데이터** (200 `[]`) | 기존 빈 상태 문구 그대로 |
| 부수 데이터 실패 | 화면에 아무 표시 없음, 로그만 |

마지막 두 줄이 회귀 판정 기준이다. 실패를 표시하기 시작하면서
**정상적인 "없음"까지 에러로 보이면 개악이다.**

### Phase 3

- 종료된 Flag 탈퇴 → 409 → **참여자 목록이 갱신되고** 안내 표시
- 만료된 초대 수락 → 409 → **초대 카드가 목록에서 사라지고** 안내 표시

Phase별 커밋. **push는 하지 않는다.**

## 6. 리스크

| 리스크 | 대응 |
|---|---|
| **실패가 눈에 보이기 시작해 "에러가 늘었다"로 인식** | 실제로는 원래 있던 실패가 드러나는 것. 부수 데이터는 조용히 두어 노출을 최소화 |
| 진짜 "빈 데이터"를 실패로 오인 표시 | `success` 플래그로만 판정. Phase 2 검증의 핵심 대조 항목 |
| 15곳을 한 번에 화면까지 연결하려다 커짐 | `failure` 필드는 추가만 하므로 화면 연결은 순차적으로 가능 |
| 재시도가 무한 반복 | `router.refresh()`는 사용자 클릭에만 반응. 자동 재시도는 넣지 않는다 |

## 7. 브랜치

`agent/task-44-screen-state-integrity` (main에서 분기, Task 43 병합 완료 상태).
