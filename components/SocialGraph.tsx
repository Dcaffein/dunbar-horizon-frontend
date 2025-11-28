"use client";

import { useState, useCallback, useMemo } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";

import type {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Core,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ElementDefinition,
  StylesheetStyle,
  NodeSingular,
  EdgeSingular,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  EventObject,
  // LayoutOptions는 여기서 쓰지 않고 직접 정의한 타입을 씁니다.
  LayoutOptions,
} from "cytoscape";

cytoscape.use(fcose);

// ----------------------------------------------------------------------
// 1. Type Definitions
// ----------------------------------------------------------------------

export interface OneHopsNetworkDto {
  friendId: string;
  friendName: string;
  alias?: string;
  mutualFriendIds: string[];
}

interface SocialGraphProps {
  friends: OneHopsNetworkDto[];
}

// ✅ [수정] LayoutOptions 상속 대신 직접 정의 (에러 해결)
interface FcoseLayoutOptions {
  name: "fcose";
  // 1. 공통 레이아웃 옵션
  fit?: boolean;
  padding?: number;
  animate?: boolean;
  animationDuration?: number;
  animationEasing?: string;
  randomize?: boolean;
  ready?: () => void;
  stop?: () => void;

  // 2. Fcose 전용 옵션
  quality?: "default" | "draft" | "proof";
  nodeRepulsion?: (node: NodeSingular) => number;
  idealEdgeLength?: (edge: EdgeSingular) => number;
  edgeElasticity?: (edge: EdgeSingular) => number;
  gravity?: number;
  nodeSeparation?: number;
  numIter?: number;
  initialEnergyOnIncremental?: number;
  // 필요하다면 추가적인 fcose 옵션들...
  nestingFactor?: number;
  gravityRange?: number;
}

// ----------------------------------------------------------------------
// 2. Component
// ----------------------------------------------------------------------

export default function SocialGraph({ friends }: SocialGraphProps) {
  const [, setCy] = useState<cytoscape.Core | null>(null);

  // 1. 데이터 변환
  const elements = useMemo(() => {
    const nodes: cytoscape.ElementDefinition[] = [];
    const edges: cytoscape.ElementDefinition[] = [];
    const addedEdges = new Set<string>();

    friends.forEach((f) => {
      nodes.push({
        data: {
          id: f.friendId,
          label: f.alias || f.friendName,
          weight: f.mutualFriendIds.length,
        },
      });

      f.mutualFriendIds.forEach((mutualId) => {
        if (friends.some((fr) => fr.friendId === mutualId)) {
          const edgeKey = [f.friendId, mutualId].sort().join("-");
          if (!addedEdges.has(edgeKey)) {
            edges.push({
              data: { source: f.friendId, target: mutualId, id: edgeKey },
            });
            addedEdges.add(edgeKey);
          }
        }
      });
    });

    return [...nodes, ...edges];
  }, [friends]);

  // 2. 초기 레이아웃 설정
  const initialLayout: FcoseLayoutOptions = {
    name: "fcose",
    quality: "default",
    randomize: true, // 초기엔 랜덤 배치 후 정렬
    animate: true,
    animationDuration: 1000,
    fit: true,
    padding: 50,

    // [기본 물리 설정]
    nodeRepulsion: (node: NodeSingular) => 50000,
    idealEdgeLength: (edge: EdgeSingular) => 300, // 기본적으로 멀리 떨어짐
    edgeElasticity: (edge: EdgeSingular) => 0.45,
    gravity: 0.1,
    nodeSeparation: 200,
    numIter: 2500,
    initialEnergyOnIncremental: 0.3,
  };

  // 3. 스타일시트 (크기 고정으로 원복)
  const stylesheet: StylesheetStyle[] = [
    {
      selector: "node",
      style: {
        width: 50, // ✅ 고정값 복구
        height: 50, // ✅ 고정값 복구
        "background-color": "#60A5FA",
        label: "data(label)",
        color: "#374151",
        "font-size": 14,
        "font-weight": "bold",
        "text-valign": "bottom",
        "text-halign": "center",
        "text-margin-y": 8,
        "border-width": 2,
        "border-color": "#fff",
        "transition-property":
          "background-color, width, height, border-width, font-size",
        "transition-duration": 300,
      },
    },
    {
      selector: "edge",
      style: {
        width: 2,
        "line-color": "#6366f1",
        "curve-style": "bezier",
        opacity: 0,
      },
    },
    {
      selector: ".highlighted",
      style: {
        "background-color": "#4F46E5",
        width: 65, // 클릭 시 약간 커짐
        height: 65,
        "border-width": 4,
        "border-color": "#C7D2FE",
        "z-index": 9999,
      },
    },
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

  // ✅ [핵심] 레이아웃 재실행 헬퍼 함수
  const runLayout = (
    cy: cytoscape.Core,
    activeNode?: cytoscape.NodeSingular
  ) => {
    // Fcose 레이아웃 인스턴스 생성
    const layout = cy.makeLayout({
      ...initialLayout,
      randomize: false, // 현재 위치에서 시작 (중요!)
      fit: false, // 줌 레벨 유지 (카메라가 튀지 않게)
      animate: true,
      animationDuration: 500, // 반응성을 위해 조금 빠르게

      // 🚀 여기가 마법이 일어나는 곳
      idealEdgeLength: (edge: EdgeSingular) => {
        // 클릭된 노드가 있고, 이 엣지가 그 노드와 연결되어 있다면?
        if (activeNode && edge.connectedNodes().has(activeNode)) {
          return 50; // 아주 가깝게 당김! (Pull)
        }
        return 300; // 나머지는 멀리 유지
      },

      // 당겨올 때 다른 노드들이 비켜나도록 반발력 유지
      nodeRepulsion: () => 50000,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    layout.run();
  };

  // 4. 이벤트 핸들러
  const handleCy = useCallback((cy: cytoscape.Core) => {
    setCy(cy);

    // 노드 클릭
    cy.on("tap", "node", (evt: cytoscape.EventObject) => {
      const node = evt.target as cytoscape.NodeSingular;

      // 1. 스타일 업데이트
      cy.elements().removeClass("highlighted neighbor visible faded");
      node.addClass("highlighted");

      const connectedEdges = node.connectedEdges();
      const connectedNodes = connectedEdges.connectedNodes();

      connectedEdges.addClass("visible");
      connectedNodes.addClass("neighbor");

      const others = cy
        .elements()
        .not(node)
        .not(connectedNodes)
        .not(connectedEdges);
      others.addClass("faded");

      // 2. ✅ 물리적으로 당겨오기 (Layout Re-run)
      runLayout(cy, node);
    });

    // 배경 클릭 (초기화)
    cy.on("tap", (evt: cytoscape.EventObject) => {
      if (evt.target === cy) {
        // 스타일 초기화
        cy.elements().removeClass("highlighted neighbor visible faded");

        // 3. ✅ 원래 간격으로 되돌리기 (activeNode 없이 실행)
        runLayout(cy, undefined);
      }
    });
  }, []);

  return (
    <div className="relative w-full h-full border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-inner">
      <CytoscapeComponent
        elements={CytoscapeComponent.normalizeElements(elements)}
        style={{ width: "100%", height: "100%" }}
        layout={initialLayout as unknown as LayoutOptions}
        stylesheet={stylesheet}
        cy={handleCy}
        pan={{ x: 0, y: 0 }}
        zoom={1}
        minZoom={0.2}
        maxZoom={3}
        wheelSensitivity={0.3}
        boxSelectionEnabled={false}
      />

      <div className="absolute top-6 right-6 bg-white/90 p-4 rounded-xl border border-gray-100 shadow-md backdrop-blur-sm text-sm text-gray-600 z-10 pointer-events-none">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-3 h-3 rounded-full bg-blue-400 block"></span>
          <span>친구</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          * 노드를 클릭하면
          <br />
          친구들이 근처로 모여듭니다.
        </p>
      </div>
    </div>
  );
}
