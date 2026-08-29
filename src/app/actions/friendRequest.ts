"use server";

import { apiClient, isRedirectError } from "@/api/apiClient";
import type { UserProfileInfo } from "@/api/model/userProfileInfo";
import type { FriendRequestResult } from "@/api/model/friendRequestResult";
import type { FriendRequestCreateRequest } from "@/api/model/friendRequestCreateRequest";
import type { FriendRequestStatusUpdateRequest } from "@/api/model/friendRequestStatusUpdateRequest";

export type FriendRequestDirection = "RECEIVED" | "SENT";
export type FriendRequestStatus = "PENDING" | "ACCEPTED" | "HIDDEN";

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

/**
 * 받은/보낸 요청을 하나의 목록 API로 조회한다.
 * status는 생략 시 백엔드가 전체 상태를 반환하므로 항상 명시 전송한다.
 */
export async function getFriendRequestsAction(
  direction: FriendRequestDirection,
  status: FriendRequestStatus = "PENDING",
) {
  try {
    const params = new URLSearchParams({ direction, status });
    const data = await apiClient.get<FriendRequestResult[]>(
      `/api/v1/friend-requests?${params.toString()}`,
    );
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("getFriendRequestsAction error:", error);
    const message = error instanceof Error ? error.message : "친구 요청을 불러오는 데 실패했습니다.";
    return { success: false as const, message };
  }
}

export async function getReceivedRequestsAction() {
  return getFriendRequestsAction("RECEIVED", "PENDING");
}

export async function getSentRequestsAction() {
  return getFriendRequestsAction("SENT", "PENDING");
}

/**
 * 수락·숨김을 하나의 상태 전이로 통합한다.
 * 대상 식별자는 UI key(UUID)가 아니라 상대 사용자 ID(counterpartId)다.
 */
export async function updateFriendRequestStatusAction(
  counterpartId: number,
  status: FriendRequestStatus,
) {
  try {
    await apiClient.patch<void, FriendRequestStatusUpdateRequest>(
      `/api/v1/friend-requests/${counterpartId}`,
      { status },
    );
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "요청 상태 변경에 실패했습니다.";
    return { success: false as const, message };
  }
}

export async function acceptFriendRequestAction(counterpartId: number) {
  return updateFriendRequestStatusAction(counterpartId, "ACCEPTED");
}

export async function hideFriendRequestAction(counterpartId: number) {
  return updateFriendRequestStatusAction(counterpartId, "HIDDEN");
}

export async function cancelFriendRequestAction(counterpartId: number) {
  try {
    await apiClient.delete(`/api/v1/friend-requests/${counterpartId}`);
    return { success: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const message = error instanceof Error ? error.message : "요청 취소에 실패했습니다.";
    return { success: false as const, message };
  }
}
