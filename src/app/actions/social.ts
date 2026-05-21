"use server";

import { apiClient, isRedirectError } from "@/api/apiClient";
import type { NetworkFriendEdge } from "@/components/socialGraph/types";
import type { NetworkFriendEdgeResult } from "@/api/model/networkFriendEdgeResult";
import { GetFriendsNetworkCircleSize } from "@/api/model/getFriendsNetworkCircleSize";

export { GetFriendsNetworkCircleSize };

function toNetworkEdge(r: NetworkFriendEdgeResult): NetworkFriendEdge {
  return {
    friendAId: r.friendAId ?? 0,
    friendBId: r.friendBId ?? 0,
    intimacy: r.intimacy ?? 0,
    friendAInterest: r.friendAInterest,
    friendBInterest: r.friendBInterest,
  };
}

export async function getFriendsNetworkAction(
  circleSize: GetFriendsNetworkCircleSize,
) {
  try {
    const data = await apiClient.get<NetworkFriendEdgeResult[]>(
      `/api/v1/networks/me?circleSize=${circleSize}`,
    );
    return { success: true, data: data.map(toNetworkEdge) };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("getFriendsNetworkAction error:", error);
    return {
      success: false,
      message: "네트워크를 불러오는 데 실패했습니다.",
    };
  }
}

export async function getLabelNetworkAction(labelId: string) {
  try {
    const data = await apiClient.get<NetworkFriendEdgeResult[]>(
      `/api/v1/networks/labels/${labelId}`,
    );
    return { success: true, data: data.map(toNetworkEdge) };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("getLabelNetworkAction error:", error);
    return {
      success: false,
      message: "라벨 네트워크를 불러오는 데 실패했습니다.",
    };
  }
}
