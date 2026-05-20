// components/Label/Label.mock.ts

import type { Label } from "./types";

export const MOCK_LABELS: Label[] = [
  {
    id: "1",
    labelName: "고등학교 동창",
    exposure: true,
    members: [
      { id: 101, nickname: "박지성" },
      { id: 102, nickname: "이영표" },
    ],
  },
  {
    id: "2",
    labelName: "회사 동료",
    exposure: false,
    members: [{ id: 103, nickname: "손흥민" }],
  },
  {
    id: "3",
    labelName: "운동 모임",
    exposure: true,
    members: [],
  },
];
