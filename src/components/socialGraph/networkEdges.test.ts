import { describe, expect, it } from "vitest";
import { deriveTargetNetworkEdges } from "./networkEdges";

describe("deriveTargetNetworkEdges", () => {
  it("target이 어느 방향에 있어도 base 네트워크와 연결된 엣지를 만든다", () => {
    const result = deriveTargetNetworkEdges(9, [1, 2], [
      { friendAId: 9, friendBId: 1, intimacy: 0.8 },
      { friendAId: 2, friendBId: 9, intimacy: 0.4 },
    ]);

    expect(result).toEqual({
      mutualFriendIds: [1, 2],
      edges: [
        { friendAId: 1, friendBId: 9, intimacy: 0.8 },
        { friendAId: 2, friendBId: 9, intimacy: 0.4 },
      ],
    });
  });

  it("누락 ID, self-loop, target 미포함, base 밖 엣지를 제외한다", () => {
    const result = deriveTargetNetworkEdges(9, [1], [
      { friendAId: undefined, friendBId: 9 },
      { friendAId: 9, friendBId: 9 },
      { friendAId: 1, friendBId: 2 },
      { friendAId: 9, friendBId: 3 },
    ]);

    expect(result).toEqual({ mutualFriendIds: [], edges: [] });
  });

  it("무방향 중복 엣지를 하나로 합치고 intimacy 누락은 0으로 보정한다", () => {
    const result = deriveTargetNetworkEdges(9, [1], [
      { friendAId: 9, friendBId: 1 },
      { friendAId: 1, friendBId: 9, intimacy: 0.7 },
    ]);

    expect(result).toEqual({
      mutualFriendIds: [1],
      edges: [{ friendAId: 1, friendBId: 9, intimacy: 0 }],
    });
  });

  it("응답이 비어 있으면 빈 결과를 반환한다", () => {
    expect(deriveTargetNetworkEdges(9, [1, 2], [])).toEqual({
      mutualFriendIds: [],
      edges: [],
    });
  });
});
