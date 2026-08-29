import type { MutualFriendEdgeResult } from "@/api/model/mutualFriendEdgeResult";
import type { NetworkFriendEdge } from "./types";

interface TargetNetworkEdges {
  mutualFriendIds: number[];
  edges: NetworkFriendEdge[];
}

function isValidFriendId(value: number | undefined): value is number {
  return value !== undefined && Number.isInteger(value) && value > 0;
}

export function deriveTargetNetworkEdges(
  targetId: number,
  baseNetworkFriendIds: number[],
  results: MutualFriendEdgeResult[],
): TargetNetworkEdges {
  const baseFriendIds = new Set(baseNetworkFriendIds);
  const mutualFriendIds = new Set<number>();
  const seenEdgeIds = new Set<string>();
  const edges: NetworkFriendEdge[] = [];

  results.forEach((result) => {
    const { friendAId, friendBId } = result;
    if (!isValidFriendId(friendAId) || !isValidFriendId(friendBId)) return;
    if (friendAId === friendBId) return;

    const containsTarget = friendAId === targetId || friendBId === targetId;
    if (!containsTarget) return;

    const mutualFriendId = friendAId === targetId ? friendBId : friendAId;
    if (!baseFriendIds.has(mutualFriendId)) return;

    const minId = Math.min(friendAId, friendBId);
    const maxId = Math.max(friendAId, friendBId);
    const edgeId = `${minId}-${maxId}`;
    if (seenEdgeIds.has(edgeId)) return;

    seenEdgeIds.add(edgeId);
    mutualFriendIds.add(mutualFriendId);
    edges.push({
      friendAId: minId,
      friendBId: maxId,
      intimacy: result.intimacy ?? 0,
    });
  });

  return { mutualFriendIds: [...mutualFriendIds], edges };
}
