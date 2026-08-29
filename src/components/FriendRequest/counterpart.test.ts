import { describe, expect, it } from "vitest";
import type { FriendRequestResult } from "@/api/model/friendRequestResult";
import { deriveCounterpartId, counterpartOf, loadingKey } from "./counterpart";

const base: FriendRequestResult = {
  id: "req-uuid-1",
  requester: { id: 10, nickname: "이수환" },
  receiver: { id: 20, nickname: "권대중" },
  status: "PENDING",
};

describe("deriveCounterpartId", () => {
  it("받은 요청(RECEIVED)의 counterpart는 requester.id다", () => {
    expect(deriveCounterpartId(base, "RECEIVED")).toBe(10);
  });

  it("보낸 요청(SENT)의 counterpart는 receiver.id다", () => {
    expect(deriveCounterpartId(base, "SENT")).toBe(20);
  });

  it("해당 방향 상대 ID가 없으면 null을 반환한다", () => {
    expect(deriveCounterpartId({ ...base, requester: { nickname: "익명" } }, "RECEIVED")).toBeNull();
    expect(deriveCounterpartId({ ...base, receiver: undefined }, "SENT")).toBeNull();
  });

  it("counterpart ID가 0이어도 null로 뭉개지 않는다", () => {
    expect(deriveCounterpartId({ ...base, requester: { id: 0 } }, "RECEIVED")).toBe(0);
  });
});

describe("counterpartOf", () => {
  it("방향별로 표시할 상대방을 반환한다", () => {
    expect(counterpartOf(base, "RECEIVED")).toEqual({ id: 10, nickname: "이수환" });
    expect(counterpartOf(base, "SENT")).toEqual({ id: 20, nickname: "권대중" });
  });
});

describe("loadingKey", () => {
  it("방향과 counterpartId를 결합해 탭 간 충돌을 방지한다", () => {
    expect(loadingKey("RECEIVED", 5)).toBe("RECEIVED:5");
    expect(loadingKey("SENT", 5)).toBe("SENT:5");
    expect(loadingKey("RECEIVED", 5)).not.toBe(loadingKey("SENT", 5));
  });
});
