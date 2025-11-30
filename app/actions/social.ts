"use server";

import { springClient } from "@/lib/springClient";

export interface FriendSuggestionDto {
  suggestedFriendId: string;
  suggestedFriendName: string;
  commonFriendId: string;
}

export async function getTwoHopSuggestionsAction() {
  try {
    const suggestions = await springClient.get<FriendSuggestionDto[]>(
      "/api/v1/social/suggestions"
    );
    return { success: true, data: suggestions };
  } catch (error) {
    console.error("Failed to fetch suggestions:", error);
    return {
      success: false,
      message: "추천 친구를 불러오는데 실패했습니다.",
      data: [],
    };
  }
}
