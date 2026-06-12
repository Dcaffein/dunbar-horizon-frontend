/* eslint-disable @typescript-eslint/no-explicit-any */
// components/socialGraph/styles.ts
import type { StylesheetStyle } from "cytoscape";
import type { LayoutType } from "./types";

export const getGraphStylesheet = (
  layoutType: LayoutType,
): StylesheetStyle[] => {
  const styles: StylesheetStyle[] = [
    {
      selector: "node",
      style: {
        width: 45,
        height: 45,
        "background-color": "#f3f4f6",
        "background-opacity": 0.75,

        //  외곽선 설정
        "border-width": 2,
        "border-color": "#9ca3af",
        "border-opacity": 1, // 내부는 투명해도 테두리는 100% 진하게 유지

        label: "data(label)",
        "font-size": "11px",
        "text-valign": "bottom",
        "text-margin-y": 4,
        "text-wrap": "wrap" as any,
        "text-max-width": "80px" as any,

        "text-background-color": "#ffffff",
        "text-background-opacity": 0.7,
        "text-background-padding": "2px",

        // transition에 background-opacity 추가
        "transition-property":
          "width, height, opacity, background-opacity, border-width, border-color",
        "transition-duration": 300,
      },
    },
    {
      selector: "edge",
      style: {
        "curve-style": "bezier",
        "line-color": "#818cf8",
        opacity: 0,
        width: 1.5,
        "transition-property": "opacity, width",
        "transition-duration": 300,
      },
    },
    {
      // 하이라이트 시 투명도를 다시 1로 올려서 돋보이게 만듦
      selector: "node.highlighted",
      style: {
        "border-width": 3,
        "border-color": "#4f46e5",
        "background-opacity": 1, // 선택된 노드는 내부가 불투명해짐
        "z-index": 999,
      },
    },
    {
      selector: "edge.visible",
      style: { opacity: 1.0 },
    },
    {
      // 비연결 노드: 테두리는 어두운 색으로 유지, 전체 opacity만 낮춤
      selector: "node.faded",
      style: {
        opacity: 0.4,
        "border-color": "#6b7280",
      },
    },
    {
      selector: "edge.faded",
      style: {
        opacity: 0.2,
      },
    },
    {
      selector: "node.buzz-unread",
      style: {
        "border-color": "#f97316",
        "border-width": 3,
        "background-color": "#fff7ed",
        "background-opacity": 0.95,
      },
    },
    {
      selector: "node.suggestion",
      style: {
        "background-color": "#fef3c7",
        "border-color": "#f59e0b",
        "border-style": "dashed",
        "border-width": 2,
        "background-opacity": 0.9,
      },
    },
    {
      selector: "edge.suggestion-edge",
      style: {
        "line-color": "#f59e0b",
        "line-style": "dashed",
        opacity: 0.55,
        width: "mapData(intimacy, 0, 1, 1, 4)" as any,
      },
    },
    {
      selector: "edge.mutual-edge",
      style: {
        "line-color": "#10b981",
        opacity: 0.65,
        width: 2,
      },
    },
  ];

  if (layoutType === "interest") {
    styles.push({
      selector: "node",
      style: {
        width: "mapData(delta, 0, 1, 30, 70)" as any,
        height: "mapData(delta, 0, 1, 30, 70)" as any,
      },
    });
  } else if (layoutType === "intimacy") {
    styles.push({
      selector: "edge.visible",
      style: {
        width: "mapData(intimacy, 0, 1, 2, 6)" as any,
        opacity: 1.0,
      },
    });
  }

  return styles;
};
