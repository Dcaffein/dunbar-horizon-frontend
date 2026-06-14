"use server";

import { apiClient, isRedirectError } from "@/api/apiClient";
import type { NetworkFriendEdge } from "@/components/socialGraph/types";
import type { NetworkGraphResult } from "@/api/model/networkGraphResult";
import { GetFriendsNetworkCircleSize } from "@/api/model/getFriendsNetworkCircleSize";
import type { AnchorExpansionResult } from "@/api/model/anchorExpansionResult";
import type { NetworkOneHopsByTwoHopResult } from "@/api/model/networkOneHopsByTwoHopResult";
import type { TraceResult } from "@/api/model/traceResult";
import type { MutualFriendEdgeResult } from "@/api/model/mutualFriendEdgeResult";
import type { SocialProfileResult } from "@/api/model/socialProfileResult";

function parseNetworkGraph(result: NetworkGraphResult): { nodeIds: number[]; edges: NetworkFriendEdge[] } {
  const nodes = result.nodes ?? [];
  const nodeIds = nodes.map((n) => n.nodeId ?? 0).filter(Boolean);

  const interestMap = new Map<number, number>();
  nodes.forEach((n) => {
    if (n.nodeId) interestMap.set(n.nodeId, n.interestScore ?? 0);
  });

  const seen = new Set<string>();
  const edges: NetworkFriendEdge[] = [];

  nodes.forEach((node) => {
    const nodeId = node.nodeId ?? 0;
    if (!nodeId) return;
    (node.edges ?? []).forEach((edge) => {
      const friendId = edge.friendId ?? 0;
      if (!friendId) return;
      const key = `${Math.min(nodeId, friendId)}-${Math.max(nodeId, friendId)}`;
      if (!seen.has(key)) {
        seen.add(key);
        edges.push({
          friendAId: nodeId,
          friendBId: friendId,
          intimacy: edge.intimacy ?? 0,
          friendAInterest: interestMap.get(nodeId),
          friendBInterest: edge.friendInterest,
        });
      }
    });
  });

  return { nodeIds, edges };
}

export async function getFriendsNetworkAction(
  circleSize: GetFriendsNetworkCircleSize,
) {
  try {
    const data = await apiClient.get<NetworkGraphResult>(
      `/api/v1/networks/me?circleSize=${circleSize}`,
    );
    return { success: true, data: parseNetworkGraph(data) };
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
      `/api/v1/networks/recommendations?anchorId=${anchorId}`,
    );
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("getTwoHopSuggestionsByAnchorAction error:", error);
    return { success: false as const, message: "추천을 불러오는 데 실패했습니다." };
  }
}

export async function getTwoHopMutualFriendsAction(targetId: number, skeletonIds: number[]) {
  try {
    const skeletonQuery = skeletonIds.map((id) => `skeletonIds=${id}`).join("&");
    const data = await apiClient.get<NetworkOneHopsByTwoHopResult[]>(
      `/api/v1/networks/mutual/two-hop?targetId=${targetId}&${skeletonQuery}`,
    );
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("getTwoHopMutualFriendsAction error:", error);
    return { success: false as const, message: "공통 친구를 불러오는 데 실패했습니다." };
  }
}

export async function getOneHopMutualFriendEdgesAction(targetId: number, skeletonIds: number[]) {
  try {
    const skeletonQuery = skeletonIds.map((id) => `skeletonIds=${id}`).join("&");
    const data = await apiClient.get<MutualFriendEdgeResult[]>(
      `/api/v1/networks/mutual/one-hop?targetId=${targetId}&${skeletonQuery}`,
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

export async function getSocialProfileAction(userId: number) {
  try {
    const data = await apiClient.get<SocialProfileResult>(`/api/v1/social/users/${userId}`);
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const };
  }
}

export async function getLabelNetworkAction(labelId: string) {
  try {
    const data = await apiClient.get<NetworkGraphResult>(
      `/api/v1/networks/labels/${labelId}`,
    );
    return { success: true as const, data: parseNetworkGraph(data) };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("getLabelNetworkAction error:", error);
    return {
      success: false as const,
      message: "라벨 네트워크를 불러오는 데 실패했습니다.",
    };
  }
}
