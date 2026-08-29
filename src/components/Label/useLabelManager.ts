import { useEffect, useRef, useState } from "react";
import type { Label, LabelCreateRequest, LabelFormError, LabelMember } from "./types";
import {
  addLabelMemberAction,
  createLabelAction,
  getLabelMembersAction,
  removeLabelMemberAction,
} from "@/app/actions/label";
import type { LabelResult } from "@/api/model/labelResult";

const LABEL_NAME_MAX_LENGTH = 20;

function toLabelFromResult(result: LabelResult): Label | null {
  if (result.id == null) return null;
  return {
    id: result.id,
    labelName: result.labelName ?? "",
    memberCount: result.memberCount ?? 0,
    members: [],
    membersStatus: "idle",
  };
}

interface UseLabelManagerResult {
  labels: Label[];
  createLabel: (request: LabelCreateRequest) => Promise<LabelFormError | null>;
  ensureMembersLoaded: (labelId: string) => Promise<LabelMember[] | null>;
  addMember: (labelId: string, memberId: number, nickname: string) => Promise<boolean>;
  removeMember: (labelId: string, memberId: number) => Promise<boolean>;
}

export function useLabelManager(initialLabels: Label[]): UseLabelManagerResult {
  const [labels, setLabels] = useState<Label[]>(initialLabels);
  const labelsRef = useRef(labels);
  const inFlightRequests = useRef(new Map<string, Promise<LabelMember[] | null>>());

  useEffect(() => {
    labelsRef.current = labels;
  }, [labels]);

  function updateLabels(updater: (current: Label[]) => Label[]) {
    setLabels((current) => {
      const next = updater(current);
      labelsRef.current = next;
      return next;
    });
  }

  async function createLabel(request: LabelCreateRequest): Promise<LabelFormError | null> {
    const trimmedName = request.labelName.trim();
    if (trimmedName.length === 0) return { labelName: "레이블 이름을 입력해주세요." };
    if (trimmedName.length > LABEL_NAME_MAX_LENGTH) {
      return { labelName: `레이블 이름은 ${LABEL_NAME_MAX_LENGTH}자 이하여야 합니다.` };
    }

    const result = await createLabelAction(trimmedName);
    if (result.success && result.data) {
      const label = toLabelFromResult(result.data);
      if (label) updateLabels((current) => [...current, label]);
    }
    return null;
  }

  function ensureMembersLoaded(labelId: string): Promise<LabelMember[] | null> {
    const label = labelsRef.current.find((item) => item.id === labelId);
    if (!label) return Promise.resolve(null);
    if (label.membersStatus === "success") return Promise.resolve(label.members);

    const existingRequest = inFlightRequests.current.get(labelId);
    if (existingRequest) return existingRequest;

    updateLabels((current) =>
      current.map((item) =>
        item.id === labelId ? { ...item, membersStatus: "loading" as const } : item,
      ),
    );

    const request = getLabelMembersAction(labelId)
      .then((result) => {
        if (!result.success) {
          updateLabels((current) =>
            current.map((item) =>
              item.id === labelId ? { ...item, membersStatus: "error" as const } : item,
            ),
          );
          return null;
        }

        const members = result.data
          .filter((member) => member.id != null)
          .map((member) => ({ id: member.id!, nickname: member.nickname ?? "" }));
        updateLabels((current) =>
          current.map((item) =>
            item.id === labelId
              ? { ...item, members, memberCount: members.length, membersStatus: "success" as const }
              : item,
          ),
        );
        return members;
      })
      .finally(() => {
        inFlightRequests.current.delete(labelId);
      });

    inFlightRequests.current.set(labelId, request);
    return request;
  }

  async function addMember(labelId: string, memberId: number, nickname: string): Promise<boolean> {
    const members = await ensureMembersLoaded(labelId);
    if (members === null) return false;
    if (members.some((member) => member.id === memberId)) return true;

    updateLabels((current) =>
      current.map((label) =>
        label.id === labelId
          ? {
              ...label,
              members: [...label.members, { id: memberId, nickname }],
              memberCount: label.memberCount + 1,
            }
          : label,
      ),
    );

    const result = await addLabelMemberAction(labelId, memberId);
    if (result.success) return true;

    updateLabels((current) =>
      current.map((label) =>
        label.id === labelId
          ? {
              ...label,
              members: label.members.filter((member) => member.id !== memberId),
              memberCount: Math.max(0, label.memberCount - 1),
            }
          : label,
      ),
    );
    return false;
  }

  async function removeMember(labelId: string, memberId: number): Promise<boolean> {
    const members = await ensureMembersLoaded(labelId);
    if (members === null) return false;
    const removedMember = members.find((member) => member.id === memberId);
    if (!removedMember) return true;

    updateLabels((current) =>
      current.map((label) =>
        label.id === labelId
          ? {
              ...label,
              members: label.members.filter((member) => member.id !== memberId),
              memberCount: Math.max(0, label.memberCount - 1),
            }
          : label,
      ),
    );

    const result = await removeLabelMemberAction(labelId, memberId);
    if (result.success) return true;

    updateLabels((current) =>
      current.map((label) =>
        label.id === labelId
          ? {
              ...label,
              members: [...label.members, removedMember],
              memberCount: label.memberCount + 1,
            }
          : label,
      ),
    );
    return false;
  }

  return { labels, createLabel, ensureMembersLoaded, addMember, removeMember };
}
