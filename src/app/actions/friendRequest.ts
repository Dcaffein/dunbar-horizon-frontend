"use server";

import { apiClient, isRedirectError } from "@/api/apiClient";
import type { UserProfileInfo } from "@/api/model/userProfileInfo";
import type { FriendRequestResult } from "@/api/model/friendRequestResult";
import type { FriendRequestCreateRequest } from "@/api/model/friendRequestCreateRequest";

export async function searchUserByEmailAction(email: string) {
  try {
    const data = await apiClient.get<UserProfileInfo>(
      `/api/v1/users/search?email=${encodeURIComponent(email)}`,
    );
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "유저 검색에 실패했습니다.";
    return { success: false as const, message };
  }
}

export async function sendFriendRequestAction(receiverId: number) {
  try {
    const data = await apiClient.post<FriendRequestResult, FriendRequestCreateRequest>(
      `/api/v1/friend-requests`,
      { receiverId },
    );
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "친구 요청 전송에 실패했습니다.";
    return { success: false as const, message };
  }
}

export async function getReceivedRequestsAction() {
  try {
    const data = await apiClient.get<FriendRequestResult[]>(`/api/v1/friend-requests`);
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("getReceivedRequestsAction error:", error);
    return { success: false as const, message: "받은 요청을 불러오는 데 실패했습니다." };
  }
}

export async function getSentRequestsAction() {
  try {
    const data = await apiClient.get<FriendRequestResult[]>(`/api/v1/friend-requests/sent`);
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("getSentRequestsAction error:", error);
    return { success: false as const, message: "보낸 요청을 불러오는 데 실패했습니다." };
  }
}

export async function acceptFriendRequestAction(requestId: string) {
  try {
    await apiClient.post(`/api/v1/friend-requests/${requestId}/accept`);
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "요청 수락에 실패했습니다.";
    return { success: false as const, message };
  }
}

export async function hideFriendRequestAction(requestId: string) {
  try {
    await apiClient.post(`/api/v1/friend-requests/${requestId}/hide`);
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "요청 숨기기에 실패했습니다.";
    return { success: false as const, message };
  }
}

export async function cancelFriendRequestAction(requestId: string) {
  try {
    await apiClient.delete(`/api/v1/friend-requests/${requestId}`);
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "요청 취소에 실패했습니다.";
    return { success: false as const, message };
  }
}
