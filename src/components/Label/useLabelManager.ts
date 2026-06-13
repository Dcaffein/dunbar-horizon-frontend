// components/Label/useLabelManager.ts

import { useState } from "react";
import type { Label, LabelCreateRequest, LabelFormError } from "./types";
import { createLabelAction, addLabelMemberAction } from "@/app/actions/label";
import type { LabelResult } from "@/api/model/labelResult";

const LABEL_NAME_MAX_LENGTH = 20;

function toLabelFromResult(r: LabelResult): Label {
  return {
    id: r.id!,
    labelName: r.labelName ?? "",
    members: (r.members ?? []).map((m) => ({ id: m.id!, nickname: m.nickname ?? "" })),
  };
}

interface UseLabelManagerResult {
  labels: Label[];
  selectedLabelId: string | null;
  createLabel: (request: LabelCreateRequest) => Promise<LabelFormError | null>;
  addMember: (labelId: string, memberId: number, nickname: string) => Promise<void>;
  selectLabel: (id: string | null) => void;
}

export function useLabelManager(initialLabels: Label[]): UseLabelManagerResult {
  const [labels, setLabels] = useState<Label[]>(initialLabels);
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);

  async function createLabel(request: LabelCreateRequest): Promise<LabelFormError | null> {
    const trimmedName = request.labelName.trim();

    if (trimmedName.length === 0) {
      return { labelName: "라벨 이름을 입력해주세요." };
    }

    if (trimmedName.length > LABEL_NAME_MAX_LENGTH) {
      return { labelName: `라벨 이름은 ${LABEL_NAME_MAX_LENGTH}자 이하여야 합니다.` };
    }

    const result = await createLabelAction(trimmedName);
    if (result.success && result.data) {
      setLabels((prev) => [...prev, toLabelFromResult(result.data!)]);
    }
    return null;
  }

  async function addMember(labelId: string, memberId: number, nickname: string): Promise<void> {
    const result = await addLabelMemberAction(labelId, memberId);
    if (result.success) {
      setLabels((prev) =>
        prev.map((label) => {
          if (label.id !== labelId) return label;
          if (label.members.some((m) => m.id === memberId)) return label;
          return { ...label, members: [...label.members, { id: memberId, nickname }] };
        }),
      );
    }
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
