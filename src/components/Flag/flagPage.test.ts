import { describe, expect, it } from "vitest";
import type { FlagResult } from "@/api/model/flagResult";
import { mergeFlagPages, toFlagPage } from "./flagPage";

const first: FlagResult = { id: 1, title: "북촌 산책", status: "RECRUITING" };
const second: FlagResult = { id: 2, title: "한강 러닝", status: "RECRUITING" };
const third: FlagResult = { id: 3, title: "독서 모임", status: "WAITING" };

describe("toFlagPage", () => {
  it("Slice의 목록과 메타데이터를 화면 페이지로 정규화한다", () => {
    expect(toFlagPage({ content: [first], number: 2, last: false }, 0)).toEqual({
      flags: [first],
      page: 2,
      isLast: false,
    });
  });

  it("선택 필드가 없는 Slice는 요청 페이지의 빈 마지막 페이지로 처리한다", () => {
    expect(toFlagPage({}, 1)).toEqual({ flags: [], page: 1, isLast: true });
  });
});

describe("mergeFlagPages", () => {
  it("다음 페이지의 새 Flag만 기존 순서 뒤에 붙인다", () => {
    expect(mergeFlagPages([first, second], [second, third])).toEqual([first, second, third]);
  });

  it("id가 없는 응답은 목록 identity를 보장할 수 없어 병합하지 않는다", () => {
    expect(mergeFlagPages([first], [{ title: "식별자 없음" }, second])).toEqual([first, second]);
  });
});
