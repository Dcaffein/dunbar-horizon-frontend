// Task 50 — 에러 문구 판정 규칙 검증.
// next/headers·next/navigation 을 쓰므로 모듈을 통째로 불러오려면 목이 필요하다.
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));
vi.mock("next/navigation", () => ({
  redirect: () => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT" });
  },
}));

const { apiClient } = await import("./apiClient");
type ApiError = import("./apiClient").ApiError;

function respond(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: false,
      status,
      text: async () => JSON.stringify(body),
    })),
  );
}

async function messageOf(status: number, body: unknown) {
  respond(status, body);
  try {
    await apiClient.get("/api/v1/whatever", { silent: true });
    throw new Error("실패했어야 한다");
  } catch (e) {
    return e as ApiError;
  }
}

describe("apiClient 문구 판정", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("INVALID_PARAMETER_TYPE 은 서버 문구를 버리고 고정 문구를 쓴다", async () => {
    const err = await messageOf(400, {
      error: "INVALID_PARAMETER_TYPE",
      message: "요청 파라미터의 형식이 올바르지 않습니다: flagId",
    });
    expect(err.message).toBe("요청을 처리할 수 없습니다.");
    expect(err.message).not.toContain("flagId");
    expect(err.code).toBe("INVALID_PARAMETER_TYPE");
  });

  it("415 는 서버 문구가 깨끗하므로 그대로 통과시킨다", async () => {
    const err = await messageOf(415, {
      error: "UNSUPPORTED_MEDIA_TYPE",
      message: "지원하지 않는 요청 형식입니다.",
    });
    expect(err.message).toBe("지원하지 않는 요청 형식입니다.");
  });

  it("표에 없는 4xx 는 서버 문구를 그대로 쓴다", async () => {
    const err = await messageOf(409, {
      error: "FLAG_SCHEDULE_INVALID",
      message: "종료는 시작보다 늦어야 합니다.",
    });
    expect(err.message).toBe("종료는 시작보다 늦어야 합니다.");
  });

  it("404 는 코드와 무관하게 덮는다 — 본문이 내부 ID 를 담는다", async () => {
    const err = await messageOf(404, {
      error: "FLAG_NOT_FOUND",
      message: "존재하지 않는 flag : 99999999",
    });
    expect(err.message).toBe("요청하신 대상을 찾을 수 없습니다.");
    expect(err.message).not.toContain("99999999");
  });

  it("5xx 는 본문을 믿지 않는다", async () => {
    const err = await messageOf(500, {
      error: "INTERNAL_SERVER_ERROR",
      message: "NullPointerException at ...",
    });
    expect(err.message).toBe(
      "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    );
  });

  it("프로토타입 키를 error 로 보내도 문구로 새지 않는다", async () => {
    const err = await messageOf(400, {
      error: "constructor",
      message: "정상 문구",
    });
    expect(err.message).toBe("정상 문구");
  });
});
