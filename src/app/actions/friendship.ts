"use server";

import { apiClient, isRedirectError } from "@/api/apiClient";
import type { FriendUpdateRequest } from "@/api/model/friendUpdateRequest";
import type { FriendshipDetailResult } from "@/api/model/friendshipDetailResult";
import type { ConnectionPathResult } from "@/api/model/connectionPathResult";

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

export async function getFriendProfileAction(friendId: number) {
  try {
    const data = await apiClient.get<FriendshipDetailResult>(`/api/v1/friends/${friendId}`, { silent: true });
    console.log("[getFriendProfileAction] friendProfileImageUrl:", data.friendProfileImageUrl);
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, message: "친구 프로필을 불러오는 데 실패했습니다." };
  }
}

export async function getConnectionPathAction(targetId: number) {
  try {
    const data = await apiClient.get<ConnectionPathResult>(`/api/v1/networks/path?targetId=${targetId}`);
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, message: "연결 경로를 불러오는 데 실패했습니다." };
  }
}
