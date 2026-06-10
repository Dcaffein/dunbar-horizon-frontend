"use server";

import { apiClient, isRedirectError } from "@/api/apiClient";
import type { NetworkFriendEdge } from "@/components/socialGraph/types";
import type { NetworkFriendEdgeResult } from "@/api/model/networkFriendEdgeResult";
import { GetFriendsNetworkCircleSize } from "@/api/model/getFriendsNetworkCircleSize";
import type { AnchorExpansionResult } from "@/api/model/anchorExpansionResult";
import type { NetworkOneHopsByTwoHopResult } from "@/api/model/networkOneHopsByTwoHopResult";
import type { TraceResult } from "@/api/model/traceResult";
import type { MutualFriendEdgeResult } from "@/api/model/mutualFriendEdgeResult";

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

export async function getTwoHopSuggestionsByAnchorAction(anchorId: number) {
  try {
    const data = await apiClient.get<AnchorExpansionResult[]>(
      `/api/v1/networks/suggestions/anchor?anchorId=${anchorId}`,
    );
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("getTwoHopSuggestionsByAnchorAction error:", error);
    return { success: false as const, message: "추천을 불러오는 데 실패했습니다." };
  }
}

export async function getTwoHopMutualFriendsAction(targetId: number) {
  try {
    const data = await apiClient.get<NetworkOneHopsByTwoHopResult[]>(
      `/api/v1/networks/mutual/two-hop?targetId=${targetId}`,
    );
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("getTwoHopMutualFriendsAction error:", error);
    return { success: false as const, message: "공통 친구를 불러오는 데 실패했습니다." };
  }
}

export async function getOneHopMutualFriendEdgesAction(targetId: number) {
  try {
    const data = await apiClient.get<MutualFriendEdgeResult[]>(
      `/api/v1/networks/mutual/one-hop?targetId=${targetId}`,
    );
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, data: [] as MutualFriendEdgeResult[] };
  }
}

export async function recordTraceAction(targetId: number) {
  try {
    const data = await apiClient.post<TraceResult, { targetId: number }>(
      "/api/v1/social/traces",
      { targetId },
    );
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const };
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
