// components/Label/types.ts

export interface Label {
  id: number;
  labelName: string;
  exposure: boolean;
  memberIds: number[];
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
