/* eslint-disable @typescript-eslint/no-explicit-any */
// components/socialGraph/index.tsx
"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const CytoscapeWrapper = dynamic(() => import("./CytoscapeWrapper"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-gray-400">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mr-3"></div>
      <p className="font-medium">그리는 중...</p>
    </div>
  ),
});

import { useGraphData } from "./useGraphData";
import { getGraphStylesheet } from "./styles";
import { getLayoutOptions } from "./layout";
import {
  getFriendsNetworkAction,
  getLabelNetworkAction,
  GetFriendsNetworkCircleSize,
} from "@/app/actions/social";
import LabelManager from "../Label/LabelManager";
import type { FriendshipDetail, NetworkFriendEdge, LayoutType } from "./types";

type SidebarTab = "network" | "label";

const CIRCLE_SIZE_LABELS: Record<GetFriendsNetworkCircleSize, string> = {
  SUPPORT: "SUPPORT ~5",
  SYMPATHY: "SYMPATHY ~15",
  KINSHIP: "KINSHIP ~50",
  DUNBAR: "DUNBAR ~150",
};

const CIRCLE_SIZE_ORDER: GetFriendsNetworkCircleSize[] = [
  GetFriendsNetworkCircleSize.SUPPORT,
  GetFriendsNetworkCircleSize.SYMPATHY,
  GetFriendsNetworkCircleSize.KINSHIP,
  GetFriendsNetworkCircleSize.DUNBAR,
];

interface SocialGraphProps {
  friends: FriendshipDetail[];
}

export default function SocialGraph({ friends }: SocialGraphProps) {
  const router = useRouter();
  const [edges, setEdges] = useState<NetworkFriendEdge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGraphActive, setIsGraphActive] = useState(false);
  const [layoutType, setLayoutType] = useState<LayoutType>("connectivity");

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("network");
  const [circleSize, setCircleSize] = useState<GetFriendsNetworkCircleSize | null>(null);
  const [activeLabelId, setActiveLabelId] = useState<string | null>(null);

  const cyRef = useRef<cytoscape.Core | null>(null);
  const elements = useGraphData({ friends, edges, layoutType });

  const CY_STYLE = useMemo(() => ({ width: "100%", height: "100%" }), []);

  const memoizedLayout = useMemo(
    () => getLayoutOptions(layoutType, false),
    [layoutType],
  );

  const memoizedStylesheet = useMemo(
    () => getGraphStylesheet(layoutType),
    [layoutType],
  );

  const handleCyInit = useCallback((cy: any) => {
    cyRef.current = cy;
    cy.off("tap");

    cy.on("tap", (evt: any) => {
      if (evt.target === cy) {
        setSelectedNodeId(null);
      }
    });

    cy.on("tap", "node", (evt: any) => {
      setSelectedNodeId(String(evt.target.id()));
    });
  }, []);

  // 노드 하이라이트 효과
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    if (!selectedNodeId) {
      cy.elements().removeClass("highlighted faded visible");
      return;
    }

    const timer = setTimeout(() => {
      const node = cy.getElementById(selectedNodeId);
      if (node.length === 0) return;

      cy.elements().removeClass("highlighted faded visible");
      cy.elements().difference(node.neighborhood()).addClass("faded");
      node.addClass("highlighted");
      node.neighborhood("node").addClass("highlighted");
      node.connectedEdges().addClass("visible");

      cy.animate(
        { center: { eles: node }, zoom: 1.0 },
        { duration: 350, easing: "ease-out-quad" },
      );
    }, 100);

    return () => clearTimeout(timer);
  }, [selectedNodeId, edges, layoutType]);

  async function handleCircleSizeSelect(size: GetFriendsNetworkCircleSize) {
    setCircleSize(size);
    setActiveLabelId(null);
    setIsLoading(true);
    try {
      const result = await getFriendsNetworkAction(size);
      if (result.success && result.data) {
        setEdges(result.data);
        setIsGraphActive(true);
      }
    } catch {
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLabelSelect(labelId: string | null) {
    setActiveLabelId(labelId);
    if (!labelId) return;

    setCircleSize(null);
    setIsLoading(true);
    try {
      const result = await getLabelNetworkAction(labelId);
      if (result.success && result.data) {
        setEdges(result.data);
        setIsGraphActive(true);
      }
    } catch {
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex h-full w-full bg-white relative overflow-hidden">
      {/* 사이드바 컨테이너 */}
      <div
        className={`relative h-full transition-all duration-300 ease-in-out shrink-0 z-20 ${
          isSidebarOpen ? "w-80" : "w-0"
        }`}
      >
        <aside
          className={`absolute top-0 left-0 w-80 h-full border-r bg-gray-50 flex flex-col transition-transform duration-300 ease-in-out ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* 사이드바 탭 */}
          <div className="flex border-b bg-white shrink-0">
            <button
              onClick={() => setSidebarTab("network")}
              className={`flex-1 py-3 text-sm font-bold transition border-b-2 ${
                sidebarTab === "network"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              네트워크
            </button>
            <button
              onClick={() => setSidebarTab("label")}
              className={`flex-1 py-3 text-sm font-bold transition border-b-2 ${
                sidebarTab === "label"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              라벨 관리
            </button>
          </div>

          {sidebarTab === "network" ? (
            <>
              <div className="p-5 border-b">
                {/* circleSize 선택 */}
                <div className="mb-4">
                  <label className="block text-xs font-bold text-gray-500 mb-2 px-1">
                    네트워크 범위
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {CIRCLE_SIZE_ORDER.map((size) => (
                      <button
                        key={size}
                        onClick={() => handleCircleSizeSelect(size)}
                        disabled={isLoading}
                        className={`py-2 text-xs font-bold rounded-lg transition ${
                          circleSize === size
                            ? "bg-indigo-600 text-white shadow"
                            : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600"
                        } disabled:opacity-50`}
                      >
                        {CIRCLE_SIZE_LABELS[size]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 테마 선택 */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 px-1">
                    테마
                  </label>
                  <div className="flex gap-1 bg-gray-200 p-1 rounded-lg">
                    {(["connectivity", "intimacy", "interest"] as LayoutType[]).map(
                      (theme) => (
                        <button
                          key={theme}
                          onClick={() => setLayoutType(theme)}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${
                            layoutType === theme
                              ? "bg-white shadow text-indigo-700"
                              : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          {theme === "connectivity" ? "연결망" : theme === "intimacy" ? "친밀도" : "관심도"}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              </div>

              {/* 친구 목록 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {friends.map((friend) => (
                  <div
                    key={friend.friendId}
                    className="flex items-center gap-3 p-2 bg-white rounded-lg shadow-sm border border-gray-100"
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0 overflow-hidden">
                      {friend.friendProfileImageUrl && (
                        <img src={friend.friendProfileImageUrl} alt="profile" />
                      )}
                    </div>
                    <p className="text-sm font-medium truncate">
                      {friend.friendAlias || friend.friendNickname}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <LabelManager
                selectedNodeId={selectedNodeId}
                friends={friends}
                onLabelSelect={(id) => handleLabelSelect(id)}
                activeLabelId={activeLabelId}
              />
            </div>
          )}
        </aside>

        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute top-1/2 -right-8 w-8 h-16 bg-white border border-l-0 border-gray-200 rounded-r-xl shadow-md flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors transform -translate-y-1/2 focus:outline-none"
          title={isSidebarOpen ? "목록 숨기기" : "목록 보기"}
        >
          {isSidebarOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          )}
        </button>
      </div>

      <main className="flex-1 h-full relative">
        {isLoading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
            <p className="font-bold text-gray-700">관계망을 계산 중입니다...</p>
          </div>
        )}

        {!isGraphActive && !isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-50/80">
            <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
            </svg>
            <p className="text-gray-500 font-medium">
              네트워크 범위를 선택하여 관계망을 시각화해보세요
            </p>
          </div>
        )}

        <CytoscapeWrapper
          elements={isGraphActive ? elements : []}
          stylesheet={memoizedStylesheet}
          layout={memoizedLayout}
          style={CY_STYLE}
          wheelSensitivity={3.0}
          cy={handleCyInit}
        />
      </main>
    </div>
  );
}
