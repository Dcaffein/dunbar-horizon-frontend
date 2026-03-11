// app/actions/social.ts
"use server";

import { springClient, isRedirectError } from "@/lib/springClient";
import type { NetworkFriendEdge } from "@/components/socialGraph/types";

export interface FriendSuggestionDto {
  suggestedFriendId: string;
  suggestedFriendName: string;
  commonFriendId: string;
}

export async function getTopIntimateNetworkAction() {
  try {
    const data = await springClient.get<NetworkFriendEdge[]>(
      "/api/v1/networks/top/intimacy",
    );

    return { success: true, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("Top Network Fetching Error:", error);
    return {
      success: false,
      message: "Dunbar Horizon의 기본 네트워크를 불러오는 데 실패했습니다.",
    };
  }
}

export async function getTopInterestNetworkAction() {
  try {
    const data = await springClient.get<NetworkFriendEdge[]>(
      "/api/v1/networks/top/interest",
    );

    return { success: true, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("Top Network Fetching Error:", error);
    return {
      success: false,
      message: "Dunbar Horizon의 기본 네트워크를 불러오는 데 실패했습니다.",
    };
  }
}

/**
 * Custom 네트워크 조회 액션
 * 사용자가 사이드바에서 선택한 친구들의 ID 배열을 백엔드로 보내어,
 * 그들 사이의 관계(엣지)만 뽑아옴.
 */
export async function getCustomNetworkAction(targetIds: number[]) {
  try {
    // 쿼리 파라미터로 전달
    const queryString = targetIds.join(",");
    const response = await springClient.get<NetworkFriendEdge[]>(
      `/api/v1/networks/verified?targetIds=${queryString}`,
    );

    return { success: true, data: response };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("Custom Network Error:", error);
    return {
      success: false,
      message: "선택하신 친구들의 관계망을 계산하는 데 실패했습니다.",
    };
  }
}

export async function getMutualEdgesByOneHopAction(friendId: number) {
  try {
    const data = await springClient.get<NetworkFriendEdge[]>(
      `/api/v1/networks/mutual/one-hop?targetId=${friendId}`,
    );
    return { success: true, data };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("Specific Friend Edges Error:", error);
    return {
      success: false,
      message: "선택하신 친구의 관계를 불러오는 데 실패했습니다.",
    };
  }
}
