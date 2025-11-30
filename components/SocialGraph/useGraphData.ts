import { useMemo } from "react";
import type { ElementDefinition } from "cytoscape";
import type { OneHopsNetworkDto, LayoutType } from "./types";
import type { FriendSuggestionDto } from "@/app/actions/social";

interface UseGraphDataProps {
  friends: OneHopsNetworkDto[];
  suggestions: FriendSuggestionDto[];
  showSuggestions: boolean;
  layoutType: LayoutType;
}

// [나선형] 위치 계산
function getSpiralPosition(rank: number, scale: number = 60) {
  const angle = rank * 2.39996;
  const radius = scale * Math.sqrt(rank);
  return {
    x: radius * Math.cos(angle),
    y: radius * Math.sin(angle),
  };
}

// [커뮤니티/친밀도형] 랜덤 위치
function getRandomPosition(id: string, scale: number = 1000) {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const rand = (h >>> 0) / 4294967296;
  return {
    x: (rand - 0.5) * scale * 2,
    y: (((rand * 100) % 1) - 0.5) * scale * 2,
  };
}

export function useGraphData({
  friends,
  suggestions,
  showSuggestions,
  layoutType,
}: UseGraphDataProps) {
  // 정렬 (중요도 순)
  const sortedFriends = useMemo(() => {
    return [...friends].sort((a, b) => {
      if (b.mutualFriendIds.length !== a.mutualFriendIds.length) {
        return b.mutualFriendIds.length - a.mutualFriendIds.length;
      }
      return a.friendId.localeCompare(b.friendId);
    });
  }, [friends]);

  const rankMap = useMemo(() => {
    const map = new Map<string, number>();
    sortedFriends.forEach((f, idx) => map.set(f.friendId, idx));
    const sortedSug = [...suggestions].sort((a, b) =>
      a.suggestedFriendId.localeCompare(b.suggestedFriendId)
    );
    sortedSug.forEach((s, idx) => {
      if (!map.has(s.suggestedFriendId)) {
        map.set(s.suggestedFriendId, sortedFriends.length + idx);
      }
    });
    return map;
  }, [sortedFriends, suggestions]);

  const elements = useMemo(() => {
    const nodes: ElementDefinition[] = [];
    const edges: ElementDefinition[] = [];
    const addedIds = new Set<string>();

    const getPosition = (id: string) => {
      const rank = rankMap.get(id) ?? 0;
      switch (layoutType) {
        case "interaction":
        case "community":
          return getRandomPosition(id, 1200);
        case "spiral":
        default:
          return getSpiralPosition(rank, 80);
      }
    };

    // 1촌 친구
    friends.forEach((f) => {
      if (!addedIds.has(f.friendId)) {
        nodes.push({
          data: {
            id: f.friendId,
            label: f.alias || f.friendName,
            // ✅ [변경] weight: 0.0~1.0 (친밀도), mutualCount: 정수 (함께 아는 친구 수)
            weight: f.weight ?? 0.1,
            mutualCount: f.mutualFriendIds.length,
            type: "friend",
          },
          position: getPosition(f.friendId),
        });
        addedIds.add(f.friendId);
      }

      f.mutualFriendIds.forEach((mutualId) => {
        if (friends.some((fr) => fr.friendId === mutualId)) {
          const edgeKey = [f.friendId, mutualId].sort().join("-");
          if (!addedIds.has(edgeKey)) {
            edges.push({
              data: {
                source: f.friendId,
                target: mutualId,
                id: edgeKey,
                type: "friend-edge",
              },
            });
            addedIds.add(edgeKey);
          }
        }
      });
    });

    // 2촌 친구
    if (showSuggestions) {
      suggestions.forEach((s) => {
        if (!addedIds.has(s.suggestedFriendId)) {
          nodes.push({
            data: {
              id: s.suggestedFriendId,
              label: s.suggestedFriendName,
              weight: 0.1, // 2촌은 기본값
              mutualCount: 1,
              type: "suggestion",
            },
            position: getPosition(s.suggestedFriendId),
          });
          addedIds.add(s.suggestedFriendId);
        }

        const edgeKey = `sug-${s.commonFriendId}-${s.suggestedFriendId}`;
        if (!addedIds.has(edgeKey)) {
          edges.push({
            data: {
              source: s.commonFriendId,
              target: s.suggestedFriendId,
              id: edgeKey,
              type: "suggestion-edge",
            },
          });
          addedIds.add(edgeKey);
        }
      });
    }

    return [...nodes, ...edges];
  }, [friends, suggestions, showSuggestions, layoutType, rankMap]);

  return elements;
}
