# Task 15: 내 프로필 조회·수정

## 배경

`GET /api/v1/users/me`, `PATCH /api/auth/users/me`, 프로필 이미지 presign API가 추가되었다.
닉네임·프로필 이미지를 수정할 수 있는 내 프로필 페이지를 구현한다.

## 사용 API

| 액션 | API |
|---|---|
| 내 프로필 조회 | `GET /api/v1/users/me` → `MyProfileResult` |
| 프로필 수정 | `PATCH /api/auth/users/me` `{ nickname, profileImageKey? }` |
| 이미지 presign | `POST /api/auth/users/me/profile-image/presign?contentType=` → `PresignedUploadResult` |

```ts
MyProfileResult {
  id?: number;
  email?: string;
  nickname?: string;
  profileImageUrl?: string;
}

UserProfileUpdateRequest {
  nickname: string;   // 2~20자
  profileImageKey?: string;
}
```

## 이미지 업로드 플로우

Buzz 이미지와 동일한 S3 presign 패턴.

```
1. POST /api/auth/users/me/profile-image/presign?contentType=image/jpeg
   → { uploadUrl, objectKey }
2. 클라이언트에서 uploadUrl로 S3 직접 PUT 업로드
3. PATCH /api/auth/users/me { nickname, profileImageKey: objectKey }
```

## UI 구조

### `/profile` — 내 프로필 페이지

헤더에 프로필 링크 추가. 서버 컴포넌트가 초기 데이터 조회.

```
/profile
┌──────────────────────────────────┐
│  [프로필 이미지]  [이미지 변경]    │
│  닉네임: 박민준                   │
│  이메일: min@example.com          │
│                                   │
│  닉네임 변경: [________] [저장]   │
└──────────────────────────────────┘
```

- 이메일은 수정 불가 (표시만)
- 이미지 변경: 파일 선택 → presign → S3 업로드 → PATCH (클라이언트에서 처리)
- 닉네임 저장: Server Action

## 상태 동기화

- 닉네임 수정: 200 OK → `router.refresh()`
- 이미지 수정: S3 업로드 완료 → PATCH 200 OK → `router.refresh()`

## 스코프 외

- 이메일 변경
- 비밀번호 변경
- 계정 탈퇴

## 검증

- `/profile` 진입 시 닉네임·이메일·프로필 이미지 표시
- 닉네임 수정 → 반영
- 프로필 이미지 변경 → S3 업로드 → 반영
- 닉네임 2자 미만·20자 초과 시 에러 표시
- `npx tsc --noEmit` 에러 없음

## Result

<!-- 작업 완료 후 기록 -->
