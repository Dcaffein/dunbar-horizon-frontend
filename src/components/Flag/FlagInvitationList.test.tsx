import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FlagInvitationList from "./FlagInvitationList";

const { acceptInvitationAction, rejectInvitationAction, push, refresh } = vi.hoisted(() => ({
  acceptInvitationAction: vi.fn(),
  rejectInvitationAction: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/app/actions/flag", () => ({
  acceptInvitationAction,
  rejectInvitationAction,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

const invitation = {
  id: 41,
  flagId: 7,
  flagTitle: "한강 피크닉",
  counterpartNickname: "민지",
  createdAt: "2026-09-12T10:00:00.000Z",
};

describe("FlagInvitationList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("모집 마감으로 수락이 거절되면 무효 카드를 제거하고 목록을 재조회한다", async () => {
    acceptInvitationAction.mockResolvedValue({
      success: false,
      message: "모집 중인 Flag가 아닙니다.",
      failure: {
        kind: "http",
        status: 409,
        code: "FLAG_NOT_RECRUITING",
        message: "모집 중인 Flag가 아닙니다.",
      },
    });

    render(<FlagInvitationList initialInvitations={[invitation]} />);
    fireEvent.click(screen.getByRole("button", { name: "수락" }));

    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(screen.queryByText("한강 피크닉")).toBeNull();
    expect(screen.queryByText("모집 중인 Flag가 아닙니다.")).not.toBeNull();
    expect(screen.queryByText("받은 초대가 없습니다.")).not.toBeNull();
  });

  it("다른 수락 실패는 카드를 유지하고 재조회하지 않는다", async () => {
    acceptInvitationAction.mockResolvedValue({
      success: false,
      message: "정원이 가득 찼습니다.",
      failure: {
        kind: "http",
        status: 409,
        code: "FLAG_FULL_CAPACITY",
        message: "정원이 가득 찼습니다.",
      },
    });

    render(<FlagInvitationList initialInvitations={[invitation]} />);
    fireEvent.click(screen.getByRole("button", { name: "수락" }));

    await waitFor(() => expect(screen.queryByText("정원이 가득 찼습니다.")).not.toBeNull());
    expect(screen.queryByText("한강 피크닉")).not.toBeNull();
    expect(refresh).not.toHaveBeenCalled();
  });
});
