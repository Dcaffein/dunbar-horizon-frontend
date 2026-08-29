"use server";

import { apiClient, isRedirectError, toFailure } from "@/api/apiClient";
import type { NetworkFriendEdge } from "@/components/socialGraph/types";
import type { NodeGraphResult } from "@/api/model/nodeGraphResult";
import { GetFriendsNetworkCircleSize } from "@/api/model/getFriendsNetworkCircleSize";
import type { AnchorExpansionResult } from "@/api/model/anchorExpansionResult";
import type { TraceResult } from "@/api/model/traceResult";
import type { MutualFriendEdgeResult } from "@/api/model/mutualFriendEdgeResult";
import type { SocialProfileResult } from "@/api/model/socialProfileResult";

function parseNetworkGraph(nodes: NodeGraphResult[]): { nodeIds: number[]; edges: NetworkFriendEdge[] } {
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
    const data = await apiClient.get<NodeGraphResult[]>(
      `/api/v1/network?circleSize=${circleSize}`,
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
      `/api/v1/network/recommendations?anchorId=${anchorId}`,
    );
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("getTwoHopSuggestionsByAnchorAction error:", error);
    const message = error instanceof Error ? error.message : "추천을 불러오는 데 실패했습니다.";
    return { success: false as const, message };
  }
}

export async function getNetworkEdgesAction(
  targetId: number,
  baseNetworkFriendIds: number[],
) {
  if (baseNetworkFriendIds.length === 0) {
    return { success: true as const, data: [] as MutualFriendEdgeResult[] };
  }

  try {
    const baseNetworkFriendIdsQuery = baseNetworkFriendIds.join(",");
    const data = await apiClient.get<MutualFriendEdgeResult[]>(
      `/api/v1/network/edges?targetId=${targetId}&baseNetworkFriendIds=${encodeURIComponent(baseNetworkFriendIdsQuery)}`,
    );
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const, data: [] as MutualFriendEdgeResult[], failure: toFailure(error) };
  }
}

export async function recordTraceAction(targetId: number) {
  try {
    const data = await apiClient.post<TraceResult, { targetId: number }>(
      "/api/v1/traces",
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
    const data = await apiClient.get<SocialProfileResult>(`/api/v1/social/profiles/${userId}`);
    console.log("[getSocialProfileAction] profileImageUrl:", data.profileImageUrl);
    return { success: true as const, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { success: false as const };
  }
}

export async function getLabelNetworkAction(labelId: string) {
  try {
    const data = await apiClient.get<NodeGraphResult[]>(
      `/api/v1/network/labels/${labelId}`,
    );
    return { success: true as const, data: parseNetworkGraph(data) };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("getLabelNetworkAction error:", error);
    return {
      success: false as const,
      message: "레이블 네트워크를 불러오는 데 실패했습니다.",
    };
  }
}
