// components/Label/types.ts

export interface LabelMember {
  id: number;
  nickname: string;
}

export type LabelMembersStatus = "idle" | "loading" | "success" | "error";

export interface Label {
  id: string;
  labelName: string;
  memberCount: number;
  members: LabelMember[];
  membersStatus: LabelMembersStatus;
}

export interface LabelCreateRequest {
  labelName: string;
}

export interface LabelMemberAddRequest {
  memberId: number;
}

export type LabelFormError = {
  labelName?: string;
};
