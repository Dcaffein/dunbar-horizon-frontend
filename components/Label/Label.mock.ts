// components/Label/Label.mock.ts

import type { Label } from "./types";

export const MOCK_LABELS: Label[] = [
  {
    id: 1,
    labelName: "고등학교 동창",
    exposure: true,
    memberIds: [101, 102],
  },
  {
    id: 2,
    labelName: "회사 동료",
    exposure: false,
    memberIds: [103],
  },
  {
    id: 3,
    labelName: "운동 모임",
    exposure: true,
    memberIds: [],
  },
];
