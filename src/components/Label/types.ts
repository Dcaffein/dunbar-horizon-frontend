// components/Label/types.ts

export interface LabelMember {
  id: number;
  nickname: string;
}

export interface Label {
  id: string;
  labelName: string;
  members: LabelMember[];
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
