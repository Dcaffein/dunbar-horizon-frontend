import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LabelManager from "./LabelManager";
import type { Label } from "./types";
import { getLabelMembersAction } from "@/app/actions/label";

vi.mock("@/app/actions/label", () => ({
  createLabelAction: vi.fn(),
  getLabelMembersAction: vi.fn(),
  addLabelMemberAction: vi.fn(),
  removeLabelMemberAction: vi.fn(),
}));

const labels: Label[] = [
  {
    id: "label-1",
    labelName: "대학교 친구",
    memberCount: 2,
    members: [],
    membersStatus: "idle",
  },
];

describe("LabelManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("목록의 memberCount를 표시하고 선택 시 멤버를 지연 조회한다", async () => {
    vi.mocked(getLabelMembersAction).mockResolvedValue({
      success: true,
      data: [
        { id: 11, nickname: "김지훈" },
        { id: 12, nickname: "박서연" },
      ],
    });
    const onLabelSelect = vi.fn();

    const { rerender } = render(
      <LabelManager
        initialLabels={labels}
        friends={[]}
        onLabelSelect={onLabelSelect}
        activeLabelId={null}
      />,
    );

    expect(screen.getByText("2명")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /대학교 친구/ }));
    rerender(
      <LabelManager
        initialLabels={labels}
        friends={[]}
        onLabelSelect={onLabelSelect}
        activeLabelId="label-1"
      />,
    );

    await waitFor(() => expect(screen.getByText("김지훈")).toBeTruthy());
    expect(screen.getByText("박서연")).toBeTruthy();
    expect(getLabelMembersAction).toHaveBeenCalledTimes(1);
  });

  it("성공한 빈 응답을 실제 빈 상태로 표시한다", async () => {
    vi.mocked(getLabelMembersAction).mockResolvedValue({ success: true, data: [] });
    const { rerender } = render(
      <LabelManager
        initialLabels={labels}
        friends={[]}
        onLabelSelect={vi.fn()}
        activeLabelId={null}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /대학교 친구/ }));
    rerender(
      <LabelManager
        initialLabels={labels}
        friends={[]}
        onLabelSelect={vi.fn()}
        activeLabelId="label-1"
      />,
    );
    await waitFor(() => expect(screen.getByText("멤버가 없습니다.")).toBeTruthy());
  });

  it("조회 실패를 빈 상태와 구분하고 재시도를 제공한다", async () => {
    vi.mocked(getLabelMembersAction).mockResolvedValue({
      success: false,
      data: [],
      message: "실패",
      failure: { kind: "unknown", message: "서버 오류" },
    });
    const { rerender } = render(
      <LabelManager
        initialLabels={labels}
        friends={[]}
        onLabelSelect={vi.fn()}
        activeLabelId={null}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /대학교 친구/ }));
    rerender(
      <LabelManager
        initialLabels={labels}
        friends={[]}
        onLabelSelect={vi.fn()}
        activeLabelId="label-1"
      />,
    );
    await waitFor(() => expect(screen.getByText("멤버를 불러오지 못했습니다.")).toBeTruthy());
    expect(screen.queryByText("멤버가 없습니다.")).toBeNull();
  });
});
