// components/socialGraph/useGraphData.ts

import { useMemo } from "react";
import type { ElementDefinition } from "cytoscape";
import type { FriendshipDetail, NetworkFriendEdge, LayoutType } from "./types";
import type { AnchorExpansionResult } from "@/api/model/anchorExpansionResult";

interface UseGraphDataProps {
  friends: FriendshipDetail[];
  edges: NetworkFriendEdge[];
  circleNodeIds: number[];
  layoutType: LayoutType;
  suggestionNodes: AnchorExpansionResult[];
  suggestionAnchorId: number | null;
  suggestionAnchorPos: { x: number; y: number } | null;
  mutualFriendIds: number[];
  selectedSuggestionId: number | null;
  unreadBuzzSenderIds: number[];
  manuallyAddedIds: Set<number>;
  manuallyHiddenIds: Set<number>;
}

function dedupById(elements: ElementDefinition[], label: string): ElementDefinition[] {
  const seen = new Set<string>();
  return elements.filter((el) => {
    const id = String(el.data.id);
    if (seen.has(id)) {
      console.warn(`[useGraphData] duplicate ${label} id skipped: ${id}`);
      return false;
    }
    seen.add(id);
    return true;
  });
}

export function useGraphData({
  friends,
  edges,
  circleNodeIds,
  layoutType,
  suggestionNodes,
  suggestionAnchorId,
  suggestionAnchorPos,
  mutualFriendIds,
  selectedSuggestionId,
  unreadBuzzSenderIds,
  manuallyAddedIds,
  manuallyHiddenIds,
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

    // circleSize 선택 시: 서버가 반환한 노드 ID 목록을 우선 사용
    // 라벨 네트워크 등 circleNodeIds 없을 때: 엣지 기반 폴백
    const edgeNodeIds = new Set<number>();
    if (circleNodeIds.length > 0) {
      circleNodeIds.forEach((id) => {
        if (!manuallyHiddenIds.has(id)) edgeNodeIds.add(id);
      });
    } else {
      edges.forEach((e) => {
        if (!manuallyHiddenIds.has(e.friendAId)) edgeNodeIds.add(e.friendAId);
        if (!manuallyHiddenIds.has(e.friendBId)) edgeNodeIds.add(e.friendBId);
      });
    }
    manuallyAddedIds.forEach((id) => edgeNodeIds.add(id));

    const allDisplayFriends = friends.filter((f) => edgeNodeIds.has(f.friendId));

    const validNodeIds = new Set(allDisplayFriends.map((f) => String(f.friendId)));

    const nodes: ElementDefinition[] = dedupById(
      allDisplayFriends.map((f) => {
        const isManual = manuallyAddedIds.has(f.friendId);
        return {
          data: {
            id: String(f.friendId),
            label: f.friendAlias && f.friendAlias !== f.friendNickname
              ? `${f.friendAlias}\n${f.friendNickname}`
              : f.friendNickname,
            intimacy: f.intimacy,
            interest: f.myInterestScore,
            delta: Math.max(0, f.myInterestScore - f.intimacy),
            mutualCount: connectionMap.get(f.friendId) || 0,
            isMuted: f.isMuted,
            type: isManual ? "manual" : "friend",
          },
          classes: buzzUnreadSet.has(f.friendId) ? "buzz-unread" : undefined,
        };
      }),
      "node",
    );

    const seenEdgeIds = new Set<string>();
    const graphEdges: ElementDefinition[] = edges
      .filter((e) => {
        if (!validNodeIds.has(String(e.friendAId)) || !validNodeIds.has(String(e.friendBId))) return false;
        const minId = Math.min(e.friendAId, e.friendBId);
        const maxId = Math.max(e.friendAId, e.friendBId);
        const edgeId = `edge-${minId}-${maxId}`;
        if (seenEdgeIds.has(edgeId)) {
          console.warn(`[useGraphData] duplicate edge id skipped: ${edgeId}`);
          return false;
        }
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

    // 추천 노드 (anchor 근처에 초기 위치 배치 → fcose가 시작점으로 사용)
    const total = suggestionNodes.length;
    const suggestionNodeEls: ElementDefinition[] = dedupById(
      suggestionNodes.map((s, i) => {
        const angle = (2 * Math.PI * i) / Math.max(total, 1);
        const pos = suggestionAnchorPos
          ? { x: suggestionAnchorPos.x + Math.cos(angle) * 100, y: suggestionAnchorPos.y + Math.sin(angle) * 100 }
          : undefined;
        return {
          data: {
            id: `suggestion-${s.id}`,
            label: s.nickname ?? "",
            intimacy: s.intimacy ?? 0,
            mutualCount: s.mutualCount ?? 0,
            type: "suggestion",
          },
          ...(pos ? { position: pos } : {}),
          classes: "suggestion",
        };
      }),
      "suggestion node",
    );

    // anchor → 추천 노드 엣지
    const suggestionEdgeEls: ElementDefinition[] =
      suggestionAnchorId !== null
        ? dedupById(
            suggestionNodes.map((s) => ({
              data: {
                id: `suggestion-edge-${suggestionAnchorId}-${s.id}`,
                source: String(suggestionAnchorId),
                target: `suggestion-${s.id}`,
                intimacy: s.intimacy ?? 0,
                type: "suggestion-edge",
              },
              classes: "suggestion-edge",
            })),
            "suggestion edge",
          )
        : [];

    // 공통 친구 → 추천 노드 엣지 (추천 노드 클릭 시)
    const mutualEdgeEls: ElementDefinition[] =
      selectedSuggestionId !== null
        ? dedupById(
            mutualFriendIds
              .filter((fid) => validNodeIds.has(String(fid)))
              .map((fid) => ({
                data: {
                  id: `mutual-edge-${fid}-${selectedSuggestionId}`,
                  source: String(fid),
                  target: `suggestion-${selectedSuggestionId}`,
                  type: "mutual-edge",
                },
                classes: "mutual-edge",
              })),
            "mutual edge",
          )
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
    circleNodeIds,
    connectionMap,
    suggestionNodes,
    suggestionAnchorId,
    suggestionAnchorPos,
    mutualFriendIds,
    selectedSuggestionId,
    unreadBuzzSenderIds,
    manuallyAddedIds,
    manuallyHiddenIds,
  ]);
}
