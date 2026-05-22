"use server";

import { apiClient, isRedirectError } from "@/api/apiClient";
import type { FriendUpdateRequest } from "@/api/model/friendUpdateRequest";

export async function updateFriendAction(
  friendId: number,
  body: FriendUpdateRequest,
) {
  try {
    await apiClient.patch(`/api/v1/friends/${friendId}`, body);
    return { success: true };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("updateFriendAction error:", error);
    return { success: false, message: "친구 정보 업데이트에 실패했습니다." };
  }
}

export async function deleteFriendAction(friendId: number) {
  try {
    await apiClient.delete(`/api/v1/friends/${friendId}`);
    return { success: true };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("deleteFriendAction error:", error);
    return { success: false, message: "친구 삭제에 실패했습니다." };
  }
}
