// components/Label/types.ts

export interface LabelMember {
  id: number;
  nickname: string;
}

export interface Label {
  id: string;
  labelName: string;
  exposure: boolean;
  members: LabelMember[];
}

export interface LabelCreateRequest {
  labelName: string;
  exposure: boolean;
}

export interface LabelMemberAddRequest {
  memberId: number;
}

export type LabelFormError = {
  labelName?: string;
};
