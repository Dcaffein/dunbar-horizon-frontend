import { describe, expect, it, vi, afterEach } from "vitest";
import { dedupeFriends } from "./dedupeFriends";
import type { FriendshipDetail } from "./types";

function friend(
  friendId: number,
  overrides: Partial<FriendshipDetail> = {},
): FriendshipDetail {
  return {
    friendId,
    friendNickname: `친구${friendId}`,
    friendProfileImageUrl: "",
    friendAlias: "",
    intimacy: 0.5,
    myInterestScore: 0.5,
    isMuted: false,
    isRoutable: true,
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("dedupeFriends", () => {
  it("중복이 없으면 순서를 그대로 유지한다", () => {
    const input = [friend(1), friend(2), friend(3)];

    expect(dedupeFriends(input)).toEqual(input);
  });

  it("같은 friendId 가 여러 번 오면 먼저 온 레코드를 남긴다", () => {
    // 실제 백엔드 사례: friendId 227(임건우)이 intimacy 0.5 / 0.375 로 두 번 내려왔다.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = dedupeFriends([
      friend(227, { friendNickname: "임건우", intimacy: 0.5, myInterestScore: 0.5 }),
      friend(228),
      friend(227, { friendNickname: "임건우", intimacy: 0.375, myInterestScore: 0.375 }),
    ]);

    expect(result.map((f) => f.friendId)).toEqual([227, 228]);
    expect(result[0].intimacy).toBe(0.5);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("227");
  });

  it("중복이 없으면 경고하지 않는다", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    dedupeFriends([friend(1), friend(2)]);

    expect(warn).not.toHaveBeenCalled();
  });

  it("빈 배열을 그대로 돌려준다", () => {
    expect(dedupeFriends([])).toEqual([]);
  });
});
