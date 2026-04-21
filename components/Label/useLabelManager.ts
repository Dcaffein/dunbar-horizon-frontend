// components/Label/useLabelManager.ts

import { useState } from "react";
import type { Label, LabelCreateRequest, LabelFormError } from "./types";
import { MOCK_LABELS } from "./Label.mock";

const LABEL_NAME_MAX_LENGTH = 20;

interface UseLabelManagerResult {
  labels: Label[];
  selectedLabelId: number | null;
  createLabel: (request: LabelCreateRequest) => LabelFormError | null;
  addMember: (labelId: number, memberId: number) => void;
  selectLabel: (id: number | null) => void;
}

export function useLabelManager(): UseLabelManagerResult {
  const [labels, setLabels] = useState<Label[]>(MOCK_LABELS);
  const [selectedLabelId, setSelectedLabelId] = useState<number | null>(null);
  const [nextId, setNextId] = useState(MOCK_LABELS.length + 1);

  function createLabel(request: LabelCreateRequest): LabelFormError | null {
    const trimmedName = request.labelName.trim();

    if (trimmedName.length === 0) {
      return { labelName: "라벨 이름을 입력해주세요." };
    }

    if (trimmedName.length > LABEL_NAME_MAX_LENGTH) {
      return { labelName: `라벨 이름은 ${LABEL_NAME_MAX_LENGTH}자 이하여야 합니다.` };
    }

    const newLabel: Label = {
      id: nextId,
      labelName: trimmedName,
      exposure: request.exposure,
      memberIds: [],
    };

    setLabels((prev) => [...prev, newLabel]);
    setNextId((prev) => prev + 1);
    return null;
  }

  function addMember(labelId: number, memberId: number): void {
    setLabels((prev) =>
      prev.map((label) => {
        if (label.id !== labelId) return label;
        if (label.memberIds.includes(memberId)) return label;
        return { ...label, memberIds: [...label.memberIds, memberId] };
      }),
    );
  }

  function selectLabel(id: number | null): void {
    setSelectedLabelId(id);
  }

  return {
    labels,
    selectedLabelId,
    createLabel,
    addMember,
    selectLabel,
  };
}
