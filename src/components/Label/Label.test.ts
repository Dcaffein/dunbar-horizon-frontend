// components/Label/Label.test.ts

import { describe, it, expect } from "vitest";
import type { Label, LabelCreateRequest } from "./types";
import { MOCK_LABELS } from "./Label.mock";

const LABEL_NAME_MAX_LENGTH = 20;

function validateLabelCreate(request: LabelCreateRequest): string | null {
  const trimmedName = request.labelName.trim();
  if (trimmedName.length === 0) return "라벨 이름을 입력해주세요.";
  if (trimmedName.length > LABEL_NAME_MAX_LENGTH) {
    return `라벨 이름은 ${LABEL_NAME_MAX_LENGTH}자 이하여야 합니다.`;
  }
  return null;
}

function addMemberToLabel(
  labels: Label[],
  labelId: string,
  memberId: number,
  nickname: string,
): Label[] {
  return labels.map((label) => {
    if (label.id !== labelId) return label;
    if (label.members.some((m) => m.id === memberId)) return label;
    return { ...label, members: [...label.members, { id: memberId, nickname }] };
  });
}

describe("validateLabelCreate", () => {
  it("정상 입력 시 에러가 없어야 한다", () => {
    expect(validateLabelCreate({ labelName: "친한 친구" })).toBeNull();
  });

  it("빈 문자열 입력 시 에러를 반환해야 한다", () => {
    expect(validateLabelCreate({ labelName: "" })).toBe(
      "라벨 이름을 입력해주세요.",
    );
  });

  it("공백만 있는 입력 시 에러를 반환해야 한다", () => {
    expect(validateLabelCreate({ labelName: "   " })).toBe(
      "라벨 이름을 입력해주세요.",
    );
  });

  it("20자 초과 입력 시 에러를 반환해야 한다", () => {
    const longName = "가".repeat(21);
    const error = validateLabelCreate({ labelName: longName });
    expect(error).toBe(`라벨 이름은 ${LABEL_NAME_MAX_LENGTH}자 이하여야 합니다.`);
  });

  it("정확히 20자 입력은 허용해야 한다", () => {
    const exactName = "가".repeat(20);
    expect(validateLabelCreate({ labelName: exactName })).toBeNull();
  });
});

describe("addMemberToLabel", () => {
  it("멤버가 정상적으로 추가되어야 한다", () => {
    const result = addMemberToLabel(MOCK_LABELS, "3", 999, "테스트유저");
    const updatedLabel = result.find((l) => l.id === "3");
    expect(updatedLabel?.members.some((m) => m.id === 999)).toBe(true);
  });

  it("추가된 멤버의 nickname이 올바르게 저장되어야 한다", () => {
    const result = addMemberToLabel(MOCK_LABELS, "3", 999, "테스트유저");
    const updatedLabel = result.find((l) => l.id === "3");
    const added = updatedLabel?.members.find((m) => m.id === 999);
    expect(added?.nickname).toBe("테스트유저");
  });

  it("이미 존재하는 memberId는 중복 추가되지 않아야 한다", () => {
    const result = addMemberToLabel(MOCK_LABELS, "1", 101, "박지성");
    const updatedLabel = result.find((l) => l.id === "1");
    const count = updatedLabel?.members.filter((m) => m.id === 101).length;
    expect(count).toBe(1);
  });

  it("존재하지 않는 labelId는 다른 라벨에 영향을 주지 않아야 한다", () => {
    const result = addMemberToLabel(MOCK_LABELS, "999", 101, "없는사람");
    expect(result).toEqual(MOCK_LABELS);
  });
});

describe("MOCK_LABELS", () => {
  it("Mock 데이터가 3개 이상이어야 한다", () => {
    expect(MOCK_LABELS.length).toBeGreaterThanOrEqual(3);
  });

  it("각 라벨의 id가 string 타입이어야 한다", () => {
    MOCK_LABELS.forEach((label) => {
      expect(typeof label.id).toBe("string");
    });
  });

  it("members 배열의 각 항목이 id(number)와 nickname(string)을 가져야 한다", () => {
    MOCK_LABELS.forEach((label) => {
      label.members.forEach((member) => {
        expect(typeof member.id).toBe("number");
        expect(typeof member.nickname).toBe("string");
      });
    });
  });
});
