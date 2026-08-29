import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SuggestionPanel from "./SuggestionPanel";

const suggestion = { id: 70, nickname: "김하늘" };

function renderPanel(
  edgesStatus: "idle" | "loading" | "success" | "error",
  mutualCount: number | null = null,
  edgesError: string | null = null,
) {
  render(
    <SuggestionPanel
      suggestion={suggestion}
      mutualCount={mutualCount}
      edgesStatus={edgesStatus}
      edgesError={edgesError}
      sendStatus="idle"
      sendError={null}
      onSendRequest={vi.fn()}
    />,
  );
}

describe("SuggestionPanel", () => {
  it("edge 조회 중에는 가짜 0명을 표시하지 않는다", () => {
    renderPanel("loading");

    expect(screen.getByText("공통 친구를 확인하는 중...")).toBeInTheDocument();
    expect(screen.queryByText("공통 친구 0명")).not.toBeInTheDocument();
  });

  it("edge 조회 성공 후 파생된 공통 친구 수를 표시한다", () => {
    renderPanel("success", 2);

    expect(screen.getByText("공통 친구 2명")).toBeInTheDocument();
  });

  it("성공한 빈 edge는 공통 친구 0명으로 표시한다", () => {
    renderPanel("success", 0);

    expect(screen.getByText("공통 친구 0명")).toBeInTheDocument();
  });

  it("edge 조회 실패 메시지를 표시한다", () => {
    renderPanel("error", null, "네트워크 연결을 확인해 주세요.");

    expect(screen.getByText("네트워크 연결을 확인해 주세요.")).toBeInTheDocument();
    expect(screen.queryByText(/공통 친구 \d+명/)).not.toBeInTheDocument();
  });
});
