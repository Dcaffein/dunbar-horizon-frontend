// components/Label/Label.test.ts

import { describe, it, expect } from "vitest";
import type { Label, LabelCreateRequest } from "./types";

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

const STUB_LABELS: Label[] = [
  { id: "uuid-1", labelName: "고등학교 동창", members: [{ id: 101, nickname: "박지성" }, { id: 102, nickname: "이영표" }] },
  { id: "uuid-2", labelName: "회사 동료", members: [{ id: 103, nickname: "손흥민" }] },
  { id: "uuid-3", labelName: "운동 모임", members: [] },
];

describe("validateLabelCreate", () => {
  it("정상 입력 시 에러가 없어야 한다", () => {
    expect(validateLabelCreate({ labelName: "친한 친구" })).toBeNull();
  });

  it("빈 문자열 입력 시 에러를 반환해야 한다", () => {
    expect(validateLabelCreate({ labelName: "" })).toBe("라벨 이름을 입력해주세요.");
  });

  it("공백만 있는 입력 시 에러를 반환해야 한다", () => {
    expect(validateLabelCreate({ labelName: "   " })).toBe("라벨 이름을 입력해주세요.");
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
    const result = addMemberToLabel(STUB_LABELS, "uuid-3", 999, "테스트유저");
    const updatedLabel = result.find((l) => l.id === "uuid-3");
    expect(updatedLabel?.members.some((m) => m.id === 999)).toBe(true);
  });

  it("추가된 멤버의 nickname이 올바르게 저장되어야 한다", () => {
    const result = addMemberToLabel(STUB_LABELS, "uuid-3", 999, "테스트유저");
    const updatedLabel = result.find((l) => l.id === "uuid-3");
    const added = updatedLabel?.members.find((m) => m.id === 999);
    expect(added?.nickname).toBe("테스트유저");
  });

  it("이미 존재하는 memberId는 중복 추가되지 않아야 한다", () => {
    const result = addMemberToLabel(STUB_LABELS, "uuid-1", 101, "박지성");
    const updatedLabel = result.find((l) => l.id === "uuid-1");
    const count = updatedLabel?.members.filter((m) => m.id === 101).length;
    expect(count).toBe(1);
  });

  it("존재하지 않는 labelId는 다른 라벨에 영향을 주지 않아야 한다", () => {
    const result = addMemberToLabel(STUB_LABELS, "uuid-999", 101, "없는사람");
    expect(result).toEqual(STUB_LABELS);
  });
});
