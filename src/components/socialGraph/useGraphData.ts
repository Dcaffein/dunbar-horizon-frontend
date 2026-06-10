// components/socialGraph/useGraphData.ts

import { useMemo } from "react";
import type { ElementDefinition } from "cytoscape";
import type { FriendshipDetail, NetworkFriendEdge, LayoutType } from "./types";
import type { AnchorExpansionResult } from "@/api/model/anchorExpansionResult";

interface UseGraphDataProps {
  friends: FriendshipDetail[];
  edges: NetworkFriendEdge[];
  layoutType: LayoutType;
  suggestionNodes: AnchorExpansionResult[];
  suggestionAnchorId: number | null;
  mutualFriendIds: number[];
  selectedSuggestionId: number | null;
  unreadBuzzSenderIds: number[];
  manuallyAddedIds: Set<number>;
}

export function useGraphData({
  friends,
  edges,
  layoutType,
  suggestionNodes,
  suggestionAnchorId,
  mutualFriendIds,
  selectedSuggestionId,
  unreadBuzzSenderIds,
  manuallyAddedIds,
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
    if (friends.length === 0) return [];

    const buzzUnreadSet = new Set(unreadBuzzSenderIds);

    // 현재 circleSize 엣지에 포함된 친구 + 수동 추가 친구만 노드로 렌더링
    const edgeNodeIds = new Set<number>();
    edges.forEach((e) => { edgeNodeIds.add(e.friendAId); edgeNodeIds.add(e.friendBId); });
    manuallyAddedIds.forEach((id) => edgeNodeIds.add(id));

    const allDisplayFriends = friends.filter((f) => edgeNodeIds.has(f.friendId));

    const validNodeIds = new Set(allDisplayFriends.map((f) => String(f.friendId)));

    const nodes: ElementDefinition[] = allDisplayFriends.map((f) => {
      const isManual = manuallyAddedIds.has(f.friendId);
      return {
        data: {
          id: String(f.friendId),
          label: f.friendAlias || f.friendNickname,
          image: f.friendProfileImageUrl || undefined,
          intimacy: f.intimacy,
          interest: f.myInterestScore,
          mutualCount: connectionMap.get(f.friendId) || 0,
          isMuted: f.isMuted,
          type: isManual ? "manual" : "friend",
        },
        classes: buzzUnreadSet.has(f.friendId) ? "buzz-unread" : undefined,
      };
    });

    const seenEdgeIds = new Set<string>();
    const graphEdges: ElementDefinition[] = edges
      .filter((e) => {
        if (!validNodeIds.has(String(e.friendAId)) || !validNodeIds.has(String(e.friendBId))) return false;
        const minId = Math.min(e.friendAId, e.friendBId);
        const maxId = Math.max(e.friendAId, e.friendBId);
        const edgeId = `edge-${minId}-${maxId}`;
        if (seenEdgeIds.has(edgeId)) return false;
        seenEdgeIds.add(edgeId);
        return true;
      })
      .map((e) => {
        const minId = Math.min(e.friendAId, e.friendBId);
        const maxId = Math.max(e.friendAId, e.friendBId);
        return {
          data: {
            id: `edge-${minId}-${maxId}`,
            source: String(e.friendAId),
            target: String(e.friendBId),
            intimacy: e.intimacy,
            friendAInterest: e.friendAInterest,
            friendBInterest: e.friendBInterest,
            type: "friend-edge",
          },
        };
      });

    // 추천 노드
    const suggestionNodeEls: ElementDefinition[] = suggestionNodes.map((s) => ({
      data: {
        id: `suggestion-${s.id}`,
        label: s.nickname ?? "",
        intimacy: s.intimacy ?? 0,
        mutualCount: s.mutualCount ?? 0,
        type: "suggestion",
      },
      classes: "suggestion",
    }));

    // anchor → 추천 노드 엣지
    const suggestionEdgeEls: ElementDefinition[] =
      suggestionAnchorId !== null
        ? suggestionNodes.map((s) => ({
            data: {
              id: `suggestion-edge-${suggestionAnchorId}-${s.id}`,
              source: String(suggestionAnchorId),
              target: `suggestion-${s.id}`,
              intimacy: s.intimacy ?? 0,
              type: "suggestion-edge",
            },
            classes: "suggestion-edge",
          }))
        : [];

    // 공통 친구 → 추천 노드 엣지 (추천 노드 클릭 시)
    const mutualEdgeEls: ElementDefinition[] =
      selectedSuggestionId !== null
        ? mutualFriendIds
            .filter((fid) => validNodeIds.has(String(fid)))
            .map((fid) => ({
              data: {
                id: `mutual-edge-${fid}-${selectedSuggestionId}`,
                source: String(fid),
                target: `suggestion-${selectedSuggestionId}`,
                type: "mutual-edge",
              },
              classes: "mutual-edge",
            }))
        : [];

    return [
      ...nodes,
      ...graphEdges,
      ...suggestionNodeEls,
      ...suggestionEdgeEls,
      ...mutualEdgeEls,
    ];
  }, [
    friends,
    edges,
    connectionMap,
    suggestionNodes,
    suggestionAnchorId,
    mutualFriendIds,
    selectedSuggestionId,
    unreadBuzzSenderIds,
    manuallyAddedIds,
  ]);
}
