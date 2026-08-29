import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Label } from "./types";
import { useLabelManager } from "./useLabelManager";
import {
  addLabelMemberAction,
  getLabelMembersAction,
  removeLabelMemberAction,
} from "@/app/actions/label";

vi.mock("@/app/actions/label", () => ({
  createLabelAction: vi.fn(),
  getLabelMembersAction: vi.fn(),
  addLabelMemberAction: vi.fn(),
  removeLabelMemberAction: vi.fn(),
}));

const initialLabels: Label[] = [
  {
    id: "label-1",
    labelName: "대학교 친구",
    memberCount: 2,
    members: [],
    membersStatus: "idle",
  },
];

describe("useLabelManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("동시에 시작한 멤버 조회를 하나의 요청으로 합치고 성공 결과를 캐시한다", async () => {
    vi.mocked(getLabelMembersAction).mockResolvedValue({
      success: true,
      data: [
        { id: 11, nickname: "김지훈" },
        { id: 12, nickname: "박서연" },
      ],
    });
    const { result } = renderHook(() => useLabelManager(initialLabels));

    let firstRequest!: Promise<unknown>;
    let secondRequest!: Promise<unknown>;
    act(() => {
      firstRequest = result.current.ensureMembersLoaded("label-1");
      secondRequest = result.current.ensureMembersLoaded("label-1");
    });
    await act(async () => {
      await Promise.all([firstRequest, secondRequest]);
    });

    expect(getLabelMembersAction).toHaveBeenCalledTimes(1);
    expect(result.current.labels[0]).toMatchObject({
      memberCount: 2,
      membersStatus: "success",
      members: [
        { id: 11, nickname: "김지훈" },
        { id: 12, nickname: "박서연" },
      ],
    });

    await act(async () => {
      await result.current.ensureMembersLoaded("label-1");
    });
    expect(getLabelMembersAction).toHaveBeenCalledTimes(1);
  });

  it("빈 멤버 응답을 조회 성공 상태로 구분한다", async () => {
    vi.mocked(getLabelMembersAction).mockResolvedValue({ success: true, data: [] });
    const { result } = renderHook(() => useLabelManager(initialLabels));

    await act(async () => {
      await result.current.ensureMembersLoaded("label-1");
    });

    expect(result.current.labels[0]).toMatchObject({
      memberCount: 0,
      members: [],
      membersStatus: "success",
    });
  });

  it("조회 실패 후 재시도할 수 있다", async () => {
    vi.mocked(getLabelMembersAction)
      .mockResolvedValueOnce({
        success: false,
        data: [],
        message: "실패",
        failure: { kind: "unknown", message: "서버 오류" },
      })
      .mockResolvedValueOnce({ success: true, data: [{ id: 11, nickname: "김지훈" }] });
    const { result } = renderHook(() => useLabelManager(initialLabels));

    await act(async () => {
      await result.current.ensureMembersLoaded("label-1");
    });
    expect(result.current.labels[0].membersStatus).toBe("error");

    await act(async () => {
      await result.current.ensureMembersLoaded("label-1");
    });
    expect(getLabelMembersAction).toHaveBeenCalledTimes(2);
    expect(result.current.labels[0].membersStatus).toBe("success");
  });

  it("멤버 추가와 삭제 실패 시 목록과 인원수를 함께 롤백한다", async () => {
    vi.mocked(getLabelMembersAction).mockResolvedValue({
      success: true,
      data: [{ id: 11, nickname: "김지훈" }],
    });
    vi.mocked(addLabelMemberAction).mockResolvedValue({ success: false, message: "추가 실패" });
    vi.mocked(removeLabelMemberAction).mockResolvedValue({ success: false, message: "삭제 실패" });
    const { result } = renderHook(() => useLabelManager(initialLabels));

    await act(async () => {
      await result.current.ensureMembersLoaded("label-1");
    });
    await act(async () => {
      await result.current.addMember("label-1", 12, "박서연");
    });
    await waitFor(() => expect(result.current.labels[0].memberCount).toBe(1));
    expect(result.current.labels[0].members.map((member) => member.id)).toEqual([11]);

    await act(async () => {
      await result.current.removeMember("label-1", 11);
    });
    expect(result.current.labels[0].memberCount).toBe(1);
    expect(result.current.labels[0].members).toEqual([{ id: 11, nickname: "김지훈" }]);
  });

  it("이미 속한 멤버는 추가 API를 호출하거나 인원수를 올리지 않는다", async () => {
    vi.mocked(getLabelMembersAction).mockResolvedValue({
      success: true,
      data: [{ id: 11, nickname: "김지훈" }],
    });
    const { result } = renderHook(() => useLabelManager(initialLabels));

    await act(async () => {
      await result.current.ensureMembersLoaded("label-1");
      await result.current.addMember("label-1", 11, "김지훈");
    });

    expect(addLabelMemberAction).not.toHaveBeenCalled();
    expect(result.current.labels[0].memberCount).toBe(1);
    expect(result.current.labels[0].members).toHaveLength(1);
  });
});
