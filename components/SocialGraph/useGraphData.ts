// components/socialGraph/useGraphData.ts

import { useMemo } from "react";
import type { ElementDefinition } from "cytoscape";
import type { FriendshipDetail, NetworkFriendEdge, LayoutType } from "./types";

interface UseGraphDataProps {
  friends: FriendshipDetail[];
  edges: NetworkFriendEdge[];
  layoutType: LayoutType;
}

export function useGraphData({
  friends,
  edges,
  layoutType,
}: UseGraphDataProps) {
  const connectionMap = useMemo(() => {
    const counts = new Map<number, number>();
    edges.forEach((edge) => {
      counts.set(edge.friendAId, (counts.get(edge.friendAId) || 0) + 1);
      counts.set(edge.friendBId, (counts.get(edge.friendBId) || 0) + 1);
    });
    return counts;
  }, [edges]);

  return useMemo(() => {
    // (선이 0개여도 친구 노드들은 화면에 띄워야 함)
    if (friends.length === 0) return [];

    // friends 배열에 있는 전원을 유효한 노드로 인정함.
    const validNodeIds = new Set(friends.map((f) => String(f.friendId)));

    const nodes: ElementDefinition[] = friends.map((f) => ({
      data: {
        id: String(f.friendId),
        label: f.friendAlias || f.friendNickname,
        image: f.friendProfileImageUrl || undefined,
        intimacy: f.intimacy,
        interest: f.myInterestScore,
        mutualCount: connectionMap.get(f.friendId) || 0,
        isMuted: f.isMuted,
        type: "friend",
      },
    }));

    // 양 끝단이 모두 내 친구 안에 있는 유효한 엣지만 남김.
    const graphEdges: ElementDefinition[] = edges
      .filter(
        (e) =>
          validNodeIds.has(String(e.friendAId)) &&
          validNodeIds.has(String(e.friendBId)),
      )
      .map((e) => {
        // 중복 엣지 완벽 방어
        const minId = Math.min(e.friendAId, e.friendBId);
        const maxId = Math.max(e.friendAId, e.friendBId);

        return {
          data: {
            id: `edge-${minId}-${maxId}`,
            source: String(e.friendAId),
            target: String(e.friendBId),
            intimacy: e.intimacy,
            type: "friend-edge",
          },
        };
      });

    return [...nodes, ...graphEdges];
  }, [friends, edges, connectionMap]);
}
