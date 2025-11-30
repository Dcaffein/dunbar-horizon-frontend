import type { StylesheetStyle, NodeSingular } from "cytoscape";
import type { LayoutType } from "./types";

export const getGraphStylesheet = (
  layoutType: LayoutType
): StylesheetStyle[] => [
  // [노드] 공통 스타일
  {
    selector: "node",
    style: {
      // ✅ [수정] 노드 크기 전반적으로 축소
      width: (ele: NodeSingular) => {
        if (layoutType === "interaction") {
          const w = ele.data("weight") || 0;
          // 기존: 40 + (w * 60) -> 최대 100px
          // 변경: 35 + (w * 45) -> 최대 80px
          return 35 + w * 45 + "px";
        }
        return "45px"; // 기본 크기도 50px -> 45px로 축소
      },
      height: (ele: NodeSingular) => {
        if (layoutType === "interaction") {
          const w = ele.data("weight") || 0;
          return 35 + w * 45 + "px";
        }
        return "45px";
      },

      "background-color": "#60A5FA",
      "background-opacity": (ele: NodeSingular) => {
        if (layoutType === "interaction") {
          const w = ele.data("weight") || 0;
          return 0.6 + w * 0.4;
        }
        return 1;
      },

      // ✅ [수정] 테두리 엹게 (두께 감소 & 색상 변경)
      "border-width": (ele: NodeSingular) => {
        const w = ele.data("weight") || 0;
        // 4px -> 3px (조금 더 얇게)
        return layoutType === "interaction" && w > 0.7 ? "3px" : "2px";
      },
      "border-color": (ele: NodeSingular) => {
        const w = ele.data("weight") || 0;
        // #FCD34D (진한 골드) -> #FDE047 (밝은 옐로우 400)
        return layoutType === "interaction" && w > 0.7 ? "#FDE047" : "#fff";
      },

      // 라벨
      label: "data(label)",
      color: "#111827",
      "font-size": (ele: NodeSingular) => {
        if (layoutType === "interaction") {
          const w = ele.data("weight") || 0;
          // 폰트 크기도 노드에 맞춰 살짝 조정
          return 11 + w * 5 + "px";
        }
        return "13px";
      },
      "font-weight": "bold",
      "text-valign": "bottom",
      "text-halign": "center",
      "text-margin-y": 6,

      "text-background-color": "#ffffff",
      "text-background-opacity": 0.8,
      "text-background-padding": "2px",
      "text-background-shape": "roundrectangle",

      "transition-property":
        "background-color, width, height, border-width, font-size, background-opacity",
      "transition-duration": 300,
    },
  },

  // [노드] 추천 친구
  {
    selector: 'node[type="suggestion"]',
    style: {
      "background-color": "#F59E0B",
      "border-style": "dashed",
      "border-width": "2px", // 3px -> 2px
    },
  },

  // [엣지]
  {
    selector: "edge",
    style: {
      width: 2,
      "curve-style": "bezier",
      opacity: 0,
    },
  },

  // [인터랙션] 하이라이트 (선택된 노드)
  {
    selector: ".highlighted",
    style: {
      "background-color": "#4F46E5",
      // 클릭 시 커지는 크기도 비율에 맞춰 조정
      width: (ele: NodeSingular) => {
        if (layoutType === "interaction") {
          const w = ele.data("weight") || 0;
          return 45 + w * 45 + "px"; // +10px 정도 커짐
        }
        return "55px";
      },
      height: (ele: NodeSingular) => {
        if (layoutType === "interaction") {
          const w = ele.data("weight") || 0;
          return 45 + w * 45 + "px";
        }
        return "55px";
      },
      "border-width": "3px", // 4px -> 3px
      "border-color": "#C7D2FE",
      "z-index": 9999,
    },
  },

  // 나머지 스타일 유지
  {
    selector: ".neighbor",
    style: {
      "background-color": "#818CF8",
    },
  },
  {
    selector: ".visible",
    style: {
      opacity: 1,
      width: 3,
      "line-color": "#6366f1",
    },
  },
  {
    selector: 'edge[type="suggestion-edge"].visible',
    style: {
      "line-style": "dashed",
      "line-color": "#F59E0B",
    },
  },
  {
    selector: ".faded",
    style: {
      opacity: 0.1,
      label: "",
    },
  },
];
