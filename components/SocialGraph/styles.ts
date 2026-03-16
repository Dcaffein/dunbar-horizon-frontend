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
        "background-image": "data(image)",
        "background-fit": "cover",
        "background-color": "#f3f4f6", // 이미지가 없을 때의 기본 색상

        // 내부 투명도 설정 (0.0 ~ 1.0)
        "background-opacity": 0.75,

        //  외곽선 설정
        "border-width": 2,
        "border-color": "#9ca3af",
        "border-opacity": 1, // 내부는 투명해도 테두리는 100% 진하게 유지

        label: "data(label)",
        "font-size": "11px",
        "text-valign": "bottom",
        "text-margin-y": 4,

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
      selector: "node.isolated",
      style: {
        opacity: 0.65,
        "border-width": 1.5,
        "border-color": "#9ca3af",
        "border-style": "dashed",
        "text-opacity": 0.9,
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
      style: { opacity: 0.6 },
    },
    {
      selector: ".faded",
      style: { opacity: 0.1 }, // fade 될 때는 전체 투명도를 확 낮춤
    },
  ];

  if (layoutType === "interest") {
    styles.push({
      selector: "node",
      style: {
        width: "mapData(interest, 0, 1, 20, 70)",
        height: "mapData(interest, 0, 1, 20, 70)",
      },
    });
  } else if (layoutType === "intimacy") {
    styles.push({
      selector: "edge",
      style: {
        width: "mapData(intimacy, 0, 1, 1, 6)",
      },
    });
    styles.push({
      selector: "edge.visible",
      style: {
        opacity: "mapData(intimacy, 0, 1, 0.2, 0.9)" as any,
      },
    });
  }

  return styles;
};
