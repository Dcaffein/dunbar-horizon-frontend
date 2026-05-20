// components/Label/useLabelManager.ts

import { useState } from "react";
import type { Label, LabelCreateRequest, LabelFormError } from "./types";
import { MOCK_LABELS } from "./Label.mock";

const LABEL_NAME_MAX_LENGTH = 20;

interface UseLabelManagerResult {
  labels: Label[];
  selectedLabelId: string | null;
  createLabel: (request: LabelCreateRequest) => LabelFormError | null;
  addMember: (labelId: string, memberId: number, nickname: string) => void;
  selectLabel: (id: string | null) => void;
}

export function useLabelManager(): UseLabelManagerResult {
  const [labels, setLabels] = useState<Label[]>(MOCK_LABELS);
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);

  function createLabel(request: LabelCreateRequest): LabelFormError | null {
    const trimmedName = request.labelName.trim();

    if (trimmedName.length === 0) {
      return { labelName: "라벨 이름을 입력해주세요." };
    }

    if (trimmedName.length > LABEL_NAME_MAX_LENGTH) {
      return { labelName: `라벨 이름은 ${LABEL_NAME_MAX_LENGTH}자 이하여야 합니다.` };
    }

    const newLabel: Label = {
      id: Date.now().toString(),
      labelName: trimmedName,
      exposure: request.exposure,
      members: [],
    };

    setLabels((prev) => [...prev, newLabel]);
    return null;
  }

  function addMember(labelId: string, memberId: number, nickname: string): void {
    setLabels((prev) =>
      prev.map((label) => {
        if (label.id !== labelId) return label;
        if (label.members.some((m) => m.id === memberId)) return label;
        return { ...label, members: [...label.members, { id: memberId, nickname }] };
      }),
    );
  }

  function selectLabel(id: string | null): void {
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
