# Verify Capture Spec

## 공통 설정

```
URL:      http://localhost:3000
Email:    lsh@test.com
Password: String123!
저장 경로: harness/verify/pages/{page-name}/
파일명:   {step}-{description}.png
```

로그인 후 쿠키를 저장해 재사용한다 (Playwright `storageState`).

> 유저 정보 및 친구 관계는 `harness/fixtures/users.md`, `harness/fixtures/friendships.md` 참조.
> 테스트 기본 계정은 **이수환(user_id=4, lsh@test.com)**이며, 친구 56명 보유.

---

## `/login`

| step | 상태/동작 | 파일명 |
|---|---|---|
| 01 | 로그인 폼 초기 상태 | `01-form.png` |

---

## `/signup`

| step | 상태/동작 | 파일명 |
|---|---|---|
| 01 | 회원가입 폼 (placeholder "영문·숫자·특수문자 포함 8~20자" + 힌트 텍스트) | `01-form.png` |
| 02 | 7자 비밀번호(`Abcd12!`) 제출 → "8자 이상" 에러 | `02-short-password-error.png` |
| 03 | 특수문자 없음(`Abcd1234`) 제출 → regex 에러 | `03-no-special-char-error.png` |

---

## `/` (메인 그래프)

> 그래프 활성화: circleSize 버튼 클릭 후 Cytoscape 렌더링 대기.
> 2-hop anchor 테스트: **배지환(id=5)** 클릭 → 권예욱(9)·정건호(85)·최지영(92) 추천 예상.

| step | 상태/동작 | 파일명 |
|---|---|---|
| 01 | 초기 진입 (그래프 비활성, 헤더 링크 전체 노출) | `01-initial.png` |
| 02 | SUPPORT circleSize 선택 → 소수 노드/엣지 | `02-support.png` |
| 03 | KINSHIP circleSize 선택 → 중간 노드/엣지 | `03-kinship.png` |
| 04 | DUNBAR circleSize 선택 → 전체 노드/엣지 | `04-dunbar.png` |
| 05 | 친구 노드 클릭 → FriendActionPanel 표시 (이름·별칭입력·음소거·추천경유·삭제·프로필 링크) | `05-friend-action-panel.png` |
| 06 | 배지환(id=5) anchor 클릭 → suggestion 노드(amber) 그래프에 추가 | `06-suggestion-nodes.png` |
| 07 | suggestion 노드 클릭 → SuggestionPanel (공통친구·친구요청 버튼) | `07-suggestion-panel.png` |
| 08 | 라벨 탭 — 라벨 목록 + `[+ 새 라벨 만들기]` 버튼 | `08-label-tab.png` |
| 09 | `[+ 새 라벨 만들기]` 클릭 → 생성 폼 토글 | `09-label-create-form.png` |
| 10 | SUPPORT 뷰 사이드바 — 뷰 밖 친구에 [+] 버튼 표시 | `10-manual-add-button.png` |
| 11 | [+] 클릭 → 점선 테두리 노드 그래프에 추가 | `11-manual-node-added.png` |

---

## `/requests`

| step | 상태/동작 | 파일명 |
|---|---|---|
| 01 | 받은 요청 탭 (PENDING 목록 또는 빈 상태) | `01-received.png` |
| 02 | 보낸 요청 탭 | `02-sent.png` |
| 03 | 친구 찾기 탭 (이메일 입력창·검색 버튼) | `03-search.png` |
| 04 | 존재하지 않는 이메일 검색 → 안내 메시지 | `04-not-found.png` |

---

## `/buzzes`

| step | 상태/동작 | 파일명 |
|---|---|---|
| 01 | 목록 (Buzz 있는 경우 — 미읽음 강조·remainingMinutes) | `01-list.png` |
| 02 | 빈 상태 ("받은 Buzz가 없습니다.") | `02-empty.png` |

> 01과 02 중 해당하는 것만 캡처.

---

## `/buzzes/new`

| step | 상태/동작 | 파일명 |
|---|---|---|
| 01 | ANCHOR 모드 (친구 드롭다운 + expansionValue 슬라이더, 레이블 "보통") | `01-anchor.png` |
| 02 | 슬라이더 최소값(0.1) → 레이블 "좁게" | `02-anchor-slider-min.png` |
| 03 | 슬라이더 최대값(1.0) → 레이블 "넓게" | `03-anchor-slider-max.png` |
| 04 | LABEL 모드 (라벨 선택 UI) | `04-label.png` |
| 05 | MANUAL 모드 (친구 다중 선택 UI) | `05-manual.png` |
| 06 | 수신자 미선택 전송 → 클라이언트 에러 | `06-validation-error.png` |

---

## `/buzzes/{buzzId}`

> 내가 작성한 Buzz가 없으면 `/buzzes/new`에서 먼저 작성.

| step | 상태/동작 | 파일명 |
|---|---|---|
| 01 | 내 Buzz 상세 (텍스트·이미지·댓글·[삭제] 버튼) | `01-my-buzz.png` |
| 02 | 내 댓글 → [수정][삭제] 버튼 표시 | `02-my-comment.png` |
| 03 | 타인 Buzz 상세 → 삭제 버튼 없음 | `03-others-buzz.png` |

> 03은 타인 Buzz가 있는 경우에만 캡처.

---

## `/flags`

| step | 상태/동작 | 파일명 |
|---|---|---|
| 01 | 주최 중 탭 (내 Flag 목록 + [모집 마감][삭제] 버튼) | `01-hosting.png` |
| 02 | 참여 중 탭 ([참여 취소] 버튼) | `02-participating.png` |
| 03 | 친구 Flag 탭 ([참여하기] 버튼) | `03-friends.png` |

---

## `/flags/new`

| step | 상태/동작 | 파일명 |
|---|---|---|
| 01 | Flag 생성 폼 (필수·선택 필드 전체) | `01-form.png` |
| 02 | 필수 필드 비워서 제출 → 에러 | `02-validation-error.png` |

---

## `/flags/{id}`

> 실제 flagId는 `/flags` 주최 중 탭에서 확인.

| step | 상태/동작 | 파일명 |
|---|---|---|
| 01 | Flag 상세 (제목·설명·일정·host 정보) | `01-detail.png` |
| 02 | 참가자 목록 섹션 | `02-participants.png` |
| 03 | 초대 섹션 (host로 로그인 시) | `03-invite-section.png` |
| 04 | 종료된 Flag 상세 (host 시점, 앙코르 버튼·메모리얼 링크 행) | `04-detail-ended.png` |
| 07 | 초대 바텀시트 모달 열린 상태 | `07-invite-modal.png` |
| 08 | 메모리얼 링크 행 (종료 Flag 한정) | `08-memorial-link.png` |
| 09 | 참여자 시점 — isHost:false, 참여 취소 버튼·초대권한 표시 | `09-participant-view.png` |

---

## `/flags/invitations`

| step | 상태/동작 | 파일명 |
|---|---|---|
| 01 | 받은 초대 목록 (거절/수락 버튼) | `01-invitation-list.png` |
| 02 | 빈 상태 ("받은 초대가 없습니다.") | `02-empty.png` |

---

## `/notifications`

| step | 상태/동작 | 파일명 |
|---|---|---|
| 01 | 알림 목록 (일반 알림) | `01-list.png` |
| 02 | FLAG_INVITATION 알림 + [수락][거절] 버튼 (있는 경우) | `02-flag-invitation.png` |
| 03 | [거절] 클릭 → "응답 완료" + 버튼 숨김 | `03-after-reject.png` |

> 02·03은 FLAG_INVITATION 알림이 존재하는 경우에만 캡처.

---

## `/friends/{friendId}`

> friendId: 그래프 노드 클릭 → FriendActionPanel "프로필 보기" 링크로 진입.

| step | 상태/동작 | 파일명 |
|---|---|---|
| 01 | 친구 프로필 (닉네임·별칭·프로필 이미지) | `01-profile.png` |
| 02 | `direct: true` → "직접 연결된 친구입니다." | `02-direct-connection.png` |
| 03 | `direct: false` → 중개인 닉네임 포함 문구 (가능한 경우) | `03-intermediary.png` |
| 04 | 프로필 이미지 없는 친구 → letter avatar | `04-letter-avatar.png` |
| 05 | `revealed: true` → amber 배너 "👀 최근 서로 자주 방문했습니다" (조건부) | `05-trace-revealed.png` |

---

## `/profile` (Task 15 — 다른 세션 작업 중)

> Task 15 구현 완료 후 추가 예정.
