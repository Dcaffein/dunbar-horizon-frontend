"use server";

import { apiClient, isRedirectError } from "@/api/apiClient";
import type { MyProfileResult } from "@/api/model/myProfileResult";
import type { UserProfileUpdateRequest } from "@/api/model/userProfileUpdateRequest";
import type { PresignedUploadResult } from "@/api/model/presignedUploadResult";

export async function getMyProfileAction() {
  try {
    const data = await apiClient.get<MyProfileResult>("/api/v1/users/me");
    console.log("[getMyProfileAction] profileImageUrl:", data.profileImageUrl);
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("getMyProfileAction error:", error);
    return { success: false as const, message: "프로필을 불러오는 데 실패했습니다." };
  }
}

export async function presignProfileImageAction(contentType: string) {
  try {
    const data = await apiClient.post<PresignedUploadResult>(
      `/api/auth/users/me/profile-image/presign?contentType=${encodeURIComponent(contentType)}`,
    );
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("presignProfileImageAction error:", error);
    return { success: false as const, message: "이미지 업로드 준비에 실패했습니다." };
  }
}

export async function updateProfileAction(body: UserProfileUpdateRequest) {
  try {
    await apiClient.patch("/api/auth/users/me", body);
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("updateProfileAction error:", error);
    return { success: false as const, message: "프로필 수정에 실패했습니다." };
  }
}
