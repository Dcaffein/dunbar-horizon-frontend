"use client";

import { useState, useCallback, useMemo } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";
import {
  getTwoHopSuggestionsAction,
  type FriendSuggestionDto,
} from "@/app/actions/social";

import type {
  OneHopsNetworkDto,
  FcoseLayoutOptions,
  LayoutType,
} from "./types";
// 함수형으로 변경된 styles import
import { getGraphStylesheet } from "./styles";
import { getLayoutOptions } from "./layout";
import { useGraphData } from "./useGraphData";

import type {
  Core,
  NodeSingular,
  EdgeSingular,
  EventObject,
  LayoutOptions,
} from "cytoscape";

cytoscape.use(fcose);

interface SocialGraphProps {
  friends: OneHopsNetworkDto[];
}

export default function SocialGraph({ friends }: SocialGraphProps) {
  const [cyInstance, setCyInstance] = useState<Core | null>(null);

  const [suggestions, setSuggestions] = useState<FriendSuggestionDto[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [layoutType, setLayoutType] = useState<LayoutType>("spiral");

  // ✅ [추가] 현재 선택된(인터랙션 중인) 노드 ID 상태 관리
  // 노드를 클릭해서 관계를 보고 있을 때는 레이아웃 변경을 막기 위함
  const [interactingNodeId, setInteractingNodeId] = useState<string | null>(
    null
  );

  const elements = useGraphData({
    friends,
    suggestions,
    showSuggestions,
    layoutType,
  });
  const layoutOptions = useMemo(
    () => getLayoutOptions(layoutType),
    [layoutType]
  );
  // 레이아웃 타입에 따라 스타일시트 동적 생성
  const stylesheet = useMemo(
    () => getGraphStylesheet(layoutType),
    [layoutType]
  );

  // ----------------------------------------------------------------------
  // Handlers
  // ----------------------------------------------------------------------

  const handleToggleSuggestions = async () => {
    if (suggestions.length > 0) {
      setShowSuggestions((prev) => !prev);
      return;
    }

    if (isLoadingSuggestions) return;
    setIsLoadingSuggestions(true);

    const result = await getTwoHopSuggestionsAction();

    if (result.success && result.data) {
      if (result.data.length === 0) {
        alert("새로운 추천 친구가 없습니다.");
      } else {
        setSuggestions(result.data);
        setShowSuggestions(true);
      }
    } else {
      alert(result.message || "추천을 불러오지 못했습니다.");
    }

    setIsLoadingSuggestions(false);
  };

  const runInteractionLayout = (cy: Core, activeNode?: NodeSingular) => {
    // ✅ [수정] 나선형(Spiral) 제한 제거: 모든 레이아웃에서 당겨오기 효과 적용
    // if (layoutType === "spiral") return;

    const currentLayout = getLayoutOptions(layoutType);

    const layoutConfig: FcoseLayoutOptions = {
      ...currentLayout,
      randomize: false,
      fit: false,
      animate: true,
      animationDuration: 800,
      animationEasing: "ease-out",
      initialEnergyOnIncremental: 0.3,

      idealEdgeLength: (edge: EdgeSingular) => {
        if (activeNode && edge.connectedNodes().has(activeNode)) {
          return 50;
        }
        return (currentLayout.idealEdgeLength as (e: EdgeSingular) => number)(
          edge
        );
      },

      nodeRepulsion: (node: NodeSingular) => {
        return (currentLayout.nodeRepulsion as (n: NodeSingular) => number)(
          node
        );
      },
    };

    cy.makeLayout(layoutConfig as unknown as LayoutOptions).run();
  };

  const handleCy = useCallback(
    (cy: Core) => {
      setCyInstance(cy);

      cy.on("tap", "node", (evt: EventObject) => {
        const node = evt.target as NodeSingular;

        // 상태 업데이트 (인터랙션 시작)
        setInteractingNodeId(node.id());

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

        runInteractionLayout(cy, node);
      });

      cy.on("tap", (evt: EventObject) => {
        if (evt.target === cy) {
          // 상태 초기화 (인터랙션 종료)
          setInteractingNodeId(null);

          cy.elements().removeClass("highlighted neighbor visible faded");
          runInteractionLayout(cy, undefined);
        }
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [layoutType]
  );

  const handleZoomIn = () => {
    if (cyInstance) {
      cyInstance.zoom({
        level: cyInstance.zoom() * 1.2,
        renderedPosition: {
          x: cyInstance.width() / 2,
          y: cyInstance.height() / 2,
        },
      });
    }
  };

  const handleZoomOut = () => {
    if (cyInstance) {
      cyInstance.zoom({
        level: cyInstance.zoom() / 1.2,
        renderedPosition: {
          x: cyInstance.width() / 2,
          y: cyInstance.height() / 2,
        },
      });
    }
  };

  // ----------------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------------

  return (
    <div className="relative w-full h-full border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-inner">
      {/* 레이아웃 선택기 */}
      <div className="absolute top-6 left-6 z-10 flex flex-col gap-2">
        <div className="bg-white/90 p-1.5 rounded-xl border border-gray-200 shadow-sm flex gap-1 backdrop-blur-sm">
          {/* ✅ [수정] interactingNodeId가 있으면 버튼 비활성화 */}
          <button
            onClick={() => setLayoutType("spiral")}
            disabled={!!interactingNodeId}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              layoutType === "spiral"
                ? "bg-indigo-100 text-indigo-700 shadow-sm"
                : "text-gray-500 hover:bg-gray-50"
            } ${!!interactingNodeId ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            🌻 연결된 친구가 많은 친구를 그룹안쪽에
          </button>
          <button
            onClick={() => setLayoutType("community")}
            disabled={!!interactingNodeId}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              layoutType === "community"
                ? "bg-indigo-100 text-indigo-700 shadow-sm"
                : "text-gray-500 hover:bg-gray-50"
            } ${!!interactingNodeId ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            💎 상호 연결된 친구가 많은 친구끼리 가깝게
          </button>
          <button
            onClick={() => setLayoutType("interaction")}
            disabled={!!interactingNodeId}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              layoutType === "interaction"
                ? "bg-indigo-100 text-indigo-700 shadow-sm"
                : "text-gray-500 hover:bg-gray-50"
            } ${!!interactingNodeId ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            💖 친밀도
          </button>
        </div>
      </div>

      <CytoscapeComponent
        elements={CytoscapeComponent.normalizeElements(elements)}
        style={{ width: "100%", height: "100%" }}
        layout={layoutOptions as unknown as LayoutOptions}
        stylesheet={stylesheet}
        cy={handleCy}
        pan={{ x: 0, y: 0 }}
        zoom={1}
        minZoom={0.2}
        maxZoom={3}
        wheelSensitivity={0.3}
        boxSelectionEnabled={false}
      />

      {/* 범례 */}
      <div className="absolute top-6 right-6 pointer-events-none z-10 flex flex-col items-end gap-2">
        <div className="bg-white/90 p-4 rounded-xl border border-gray-100 shadow-md backdrop-blur-sm text-sm text-gray-600">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-3 h-3 rounded-full bg-blue-400 block"></span>
            <span>친구</span>
          </div>
          {suggestions.length > 0 && showSuggestions && (
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 block border border-dashed border-white"></span>
              <span>추천 친구 (2촌)</span>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2">
            * 노드를 클릭하면
            <br />
            친구가 당겨집니다.
          </p>
        </div>
      </div>

      {/* 줌 컨트롤 */}
      <div className="absolute bottom-8 right-6 z-10 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="w-10 h-10 bg-white rounded-full shadow-md border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-colors focus:outline-none"
          title="Zoom In"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        </button>
        <button
          onClick={handleZoomOut}
          className="w-10 h-10 bg-white rounded-full shadow-md border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-colors focus:outline-none"
          title="Zoom Out"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M20 12H4"
            />
          </svg>
        </button>
      </div>

      {/* 친구 추천 버튼 */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
        <button
          onClick={handleToggleSuggestions}
          disabled={isLoadingSuggestions}
          className={`
              font-bold py-3 px-6 rounded-full shadow-lg transition-all transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2
              ${
                showSuggestions
                  ? "bg-white text-indigo-600 border-2 border-indigo-600 hover:bg-indigo-50"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }
            `}
        >
          {isLoadingSuggestions ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              분석 중...
            </>
          ) : (
            <>
              <span>{showSuggestions ? "👁️‍🗨️" : "✨"}</span>
              {suggestions.length === 0
                ? "2촌 친구 추천 받기"
                : showSuggestions
                ? "추천 친구 숨기기"
                : "추천 친구 보기"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
