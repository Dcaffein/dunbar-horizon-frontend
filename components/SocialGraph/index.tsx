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
  getTopIntimateNetworkAction,
  getCustomNetworkAction,
  getMutualEdgesByOneHopAction,
  getTopInterestNetworkAction,
} from "@/app/actions/social";
import type { FriendshipDetail, NetworkFriendEdge, LayoutType } from "./types";

interface SocialGraphProps {
  friends: FriendshipDetail[];
}

export default function SocialGraph({ friends }: SocialGraphProps) {
  const router = useRouter();
  const [edges, setEdges] = useState<NetworkFriendEdge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGraphActive, setIsGraphActive] = useState(false);
  const [layoutType, setLayoutType] = useState<LayoutType>("connectivity");

  const [networkMode, setNetworkMode] = useState<"top" | "custom">("top");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isSnapshot, setIsSnapshot] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const cyRef = useRef<cytoscape.Core | null>(null);
  const elements = useGraphData({ friends, edges, layoutType });

  const CY_STYLE = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const isFetchingEdges = useRef(false);

  const memoizedLayout = useMemo(
    () => getLayoutOptions(layoutType, isSnapshot),
    [layoutType, isSnapshot],
  );

  const memoizedStylesheet = useMemo(
    () => getGraphStylesheet(layoutType),
    [layoutType],
  );

  // 클릭 시 API를 호출할지 말지 결정하는 Ref 함수
  const handleNodeClickRef = useRef((nodeId: number) => {});

  // 매 렌더링마다 최신 edges를 참조하도록 업데이트
  handleNodeClickRef.current = async (nodeId: number) => {
    setSelectedNodeId(String(nodeId));

    const isAlreadyLoaded = edges.some((e) => e.friendAId === nodeId);

    if (!isAlreadyLoaded) {
      // 새로운 엣지를 가져올 때는 기존의 강력한 레이아웃(3000번)이
      // CytoscapeWrapper의 useEffect를 통해 자동으로 돌아감.
      isFetchingEdges.current = true;
      try {
        const result = await getMutualEdgesByOneHopAction(nodeId);
        if (result.success && result.data) {
          setEdges((prev) => [...prev, ...result.data]);
        }
      } catch (error) {
        console.error("엣지 데이터를 불러오는데 실패했습니다.", error);
      }
    } else {
      //  이미 다 불러온 노드라면 가벼운 레이아웃만 재실행함.
      isFetchingEdges.current = false;

      if (cyRef.current) {
        // 기존 옵션을 가져오되, 연산량만 낮춰서 덮어씌움
        const lightOptions = {
          ...getLayoutOptions(layoutType, isSnapshot),
          quality: "proof",
          numIter: 800, // 횟수 작게
          randomize: false,
          fit: false,
        };
        cyRef.current.layout(lightOptions).run();
      }
    }
  };

  const handleCyInit = useCallback((cy: any) => {
    cyRef.current = cy;
    cy.off("tap");

    // 배경 클릭 시 리셋
    cy.on("tap", (evt: any) => {
      if (evt.target === cy) {
        setSelectedNodeId(null);
      }
    });

    // 노드 클릭 시
    cy.on("tap", "node", (evt: any) => {
      // cytoscape의 id는 string이므로 number로 변환해서 넘겨줌
      handleNodeClickRef.current(Number(evt.target.id()));
    });
  }, []);

  // 선택된 노드와 엣지를 하이라이트하고 줌인하는 효과
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    if (!selectedNodeId) {
      cy.elements().removeClass("highlighted faded visible");
      return;
    }

    // 새로운 엣지를 가져와서 노드가 이동 중일 때는 600ms를 넉넉히 기다리고,
    // 원래 있던 노드라면 100ms 만에 즉각 반응함.
    const delay = isFetchingEdges.current ? 400 : 100;

    const timer = setTimeout(() => {
      const node = cy.getElementById(selectedNodeId);
      if (node.length === 0) return;

      cy.elements().removeClass("highlighted faded visible");
      cy.elements().difference(node.neighborhood()).addClass("faded");
      node.addClass("highlighted");
      node.neighborhood("node").addClass("highlighted");
      node.connectedEdges().addClass("visible");

      cy.animate(
        {
          center: { eles: node },
          zoom: 1.0,
        },
        { duration: 350, easing: "ease-out-quad" },
      );

      // 카메라 이동이 끝나면 flag false
      isFetchingEdges.current = false;
    }, delay);

    return () => clearTimeout(timer);
  }, [selectedNodeId, edges, layoutType]);

  //  기본 TOP 150 intimacy 네트워크 렌더링
  const handleActivateTopNetwork = async () => {
    setIsLoading(true);
    setIsSnapshot(false);
    try {
      // 현재 선택된 테마가 '관심도'라면 관심도 API를, 아니면 기본(친밀도) API를 호출함.
      const result =
        layoutType === "interest"
          ? await getTopInterestNetworkAction()
          : await getTopIntimateNetworkAction();

      if (result.success && result.data) {
        setEdges(result.data);
        setIsGraphActive(true);
      }
    } catch (error) {
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleThemeChange = async (newLayout: LayoutType) => {
    // 버튼 색상 및 레이아웃 규칙은 즉시 변경해서 애니메이션이 시작되게 함
    setLayoutType(newLayout);

    if (isGraphActive && networkMode === "top") {
      //  데이터 교체가 진짜 필요한 상황인지 검사함.
      // 기존 테마가 관심도였는지, 새 테마가 관심도인지 확인
      const isOldInterest = layoutType === "interest";
      const isNewInterest = newLayout === "interest";

      // 둘의 상태가 다를 때만 (친밀도 계열 <-> 관심도) 데이터를 새로 받아옴.
      if (isOldInterest !== isNewInterest) {
        setIsLoading(true);
        try {
          const result = isNewInterest
            ? await getTopInterestNetworkAction()
            : await getTopIntimateNetworkAction();

          if (result.success && result.data) {
            setEdges(result.data);
          }
        } catch (error) {
          console.error("테마 데이터 변경 실패:", error);
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  //  사용자 지정 네트워크 렌더링
  const handleActivateCustomNetwork = async () => {
    if (selectedIds.size < 2) return alert("2명 이상의 친구를 선택해주세요.");

    setIsLoading(true);
    if (selectedIds.size > 50) {
      setIsSnapshot(true);
    }
    try {
      const result = await getCustomNetworkAction(Array.from(selectedIds));

      if (!result.success || !result.data) {
        throw new Error(result.message || "데이터를 불러오지 못했습니다.");
      }

      setEdges(result.data);
      setIsGraphActive(true);
    } catch (error) {
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelection = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

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
          <div className="p-5 border-b">
            <div className="flex gap-2 mb-4 bg-gray-200 p-1 rounded-lg">
              <button
                onClick={() => setNetworkMode("top")}
                className={`flex-1 py-1.5 text-sm font-bold rounded-md transition ${networkMode === "top" ? "bg-white shadow" : "text-gray-500"}`}
              >
                TOP 네트워크
              </button>
              <button
                onClick={() => setNetworkMode("custom")}
                className={`flex-1 py-1.5 text-sm font-bold rounded-md transition ${networkMode === "custom" ? "bg-white shadow" : "text-gray-500"}`}
              >
                직접 선택
              </button>
            </div>

            <button
              onClick={
                networkMode === "top"
                  ? handleActivateTopNetwork
                  : handleActivateCustomNetwork
              }
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50"
            >
              {isLoading ? "지평선 탐색 중..." : "네트워크 렌더링 시작"}
            </button>
            <div className="mt-5">
              <label className="block text-xs font-bold text-gray-500 mb-2 px-1">
                지평선 관점 (레이아웃)
              </label>
              <div className="flex gap-1 bg-gray-200 p-1 rounded-lg">
                <button
                  onClick={() => handleThemeChange("connectivity")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${
                    layoutType === "connectivity"
                      ? "bg-white shadow text-indigo-700"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  연결망
                </button>
                <button
                  onClick={() => handleThemeChange("intimacy")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${
                    layoutType === "intimacy"
                      ? "bg-white shadow text-indigo-700"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  친밀도
                </button>
                <button
                  onClick={() => handleThemeChange("interest")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${
                    layoutType === "interest"
                      ? "bg-white shadow text-indigo-700"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  관심도
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {friends.map((friend) => (
              <div
                key={friend.friendId}
                className="flex items-center gap-3 p-2 bg-white rounded-lg shadow-sm border border-gray-100"
              >
                {networkMode === "custom" && (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(friend.friendId)}
                    onChange={() => toggleSelection(friend.friendId)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                )}
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
        </aside>

        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute top-1/2 -right-8 w-8 h-16 bg-white border border-l-0 border-gray-200 rounded-r-xl shadow-md flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors transform -translate-y-1/2 focus:outline-none"
          title={isSidebarOpen ? "목록 숨기기" : "목록 보기"}
        >
          {isSidebarOpen ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          )}
        </button>
      </div>

      <main className="flex-1 h-full relative">
        {/* 기존 로딩 스피너 */}
        {isLoading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
            <p className="font-bold text-gray-700">관계망을 계산 중입니다...</p>
          </div>
        )}

        {/* 렌더링 전 빈 화면일 때 보여줄 안내 메시지 */}
        {!isGraphActive && !isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-50/80">
            <svg
              className="w-16 h-16 text-gray-300 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"
              />
            </svg>
            <p className="text-gray-500 font-medium">
              친구들로 이뤄진 네트워크를 시각화해보세요
            </p>
          </div>
        )}

        <CytoscapeWrapper
          // isGraphActive가 true일 때만 elements를 넘기고, 아니면 빈 배열([])을 넘김.
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
