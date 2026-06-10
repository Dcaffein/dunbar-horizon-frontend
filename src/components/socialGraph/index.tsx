/* eslint-disable @typescript-eslint/no-explicit-any */
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
  getTwoHopSuggestionsByAnchorAction,
  getTwoHopMutualFriendsAction,
  getOneHopMutualFriendEdgesAction,
} from "@/app/actions/social";
import { sendFriendRequestAction } from "@/app/actions/friendRequest";
import { GetFriendsNetworkCircleSize } from "@/api/model/getFriendsNetworkCircleSize";
import type { AnchorExpansionResult } from "@/api/model/anchorExpansionResult";
import LabelManager from "../Label/LabelManager";
import FriendActionPanel from "../FriendActionPanel/FriendActionPanel";
import SuggestionPanel from "../SuggestionPanel/SuggestionPanel";
import type { FriendshipDetail, NetworkFriendEdge, LayoutType } from "./types";

type SidebarTab = "network" | "label";
type SuggestionSendStatus = "idle" | "loading" | "sent" | "error";

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
  unreadBuzzSenderIds?: number[];
}

export default function SocialGraph({ friends, unreadBuzzSenderIds = [] }: SocialGraphProps) {
  const router = useRouter();
  const [friendsList, setFriendsList] = useState<FriendshipDetail[]>(friends);
  const [edges, setEdges] = useState<NetworkFriendEdge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGraphActive, setIsGraphActive] = useState(false);
  const [layoutType, setLayoutType] = useState<LayoutType>("connectivity");

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("network");
  const [circleSize, setCircleSize] = useState<GetFriendsNetworkCircleSize | null>(null);
  const [activeLabelId, setActiveLabelId] = useState<string | null>(null);

  // 수동 추가 노드
  const [manuallyAddedIds, setManuallyAddedIds] = useState<Set<number>>(new Set());

  // 2-hop 추천 state
  const [suggestionNodes, setSuggestionNodes] = useState<AnchorExpansionResult[]>([]);
  const [suggestionAnchorId, setSuggestionAnchorId] = useState<number | null>(null);
  const [mutualFriendIds, setMutualFriendIds] = useState<number[]>([]);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<number | null>(null);
  const [suggestionSendStatus, setSuggestionSendStatus] = useState<SuggestionSendStatus>("idle");
  const [suggestionSendError, setSuggestionSendError] = useState<string | null>(null);

  const cyRef = useRef<cytoscape.Core | null>(null);

  const elements = useGraphData({
    friends: friendsList,
    edges,
    layoutType,
    suggestionNodes,
    suggestionAnchorId,
    mutualFriendIds,
    selectedSuggestionId,
    unreadBuzzSenderIds,
    manuallyAddedIds,
  });

  // "그래프에 있는 친구" = 현재 circleSize 엣지에 포함된 친구 + 수동 추가 친구
  const graphNodeIds = useMemo(() => {
    const ids = new Set<string>();
    edges.forEach((e) => {
      ids.add(String(e.friendAId));
      ids.add(String(e.friendBId));
    });
    manuallyAddedIds.forEach((id) => ids.add(String(id)));
    return ids;
  }, [edges, manuallyAddedIds]);

  const selectedFriend = friendsList.find(
    (f) => String(f.friendId) === selectedNodeId,
  ) ?? null;

  const selectedSuggestion = selectedSuggestionId !== null
    ? suggestionNodes.find((s) => s.id === selectedSuggestionId) ?? null
    : null;

  const CY_STYLE = useMemo(() => ({ width: "100%", height: "100%" }), []);

  const memoizedLayout = useMemo(
    () => getLayoutOptions(layoutType, false),
    [layoutType],
  );

  const memoizedStylesheet = useMemo(
    () => getGraphStylesheet(layoutType),
    [layoutType],
  );

  function clearSuggestions() {
    setSuggestionNodes([]);
    setSuggestionAnchorId(null);
    setMutualFriendIds([]);
    setSelectedSuggestionId(null);
    setSuggestionSendStatus("idle");
    setSuggestionSendError(null);
  }

  function handleAddFriend(friendId: number) {
    setManuallyAddedIds((prev) => new Set(prev).add(friendId));
  }

  async function handleAnchorTap(anchorId: number) {
    setMutualFriendIds([]);
    setSelectedSuggestionId(null);
    setSuggestionSendStatus("idle");
    setSuggestionSendError(null);

    // 수동 추가 노드 클릭 시 one-hop 엣지 로드
    if (manuallyAddedIds.has(anchorId)) {
      const result = await getOneHopMutualFriendEdgesAction(anchorId);
      if (result.success && result.data.length > 0) {
        setEdges((prev) => {
          const existingIds = new Set(prev.map((e) => `${Math.min(e.friendAId, e.friendBId)}-${Math.max(e.friendAId, e.friendBId)}`));
          const newEdges = result.data
            .filter((e) => e.friendAId != null && e.friendBId != null)
            .filter((e) => {
              const key = `${Math.min(e.friendAId!, e.friendBId!)}-${Math.max(e.friendAId!, e.friendBId!)}`;
              return !existingIds.has(key);
            })
            .map((e) => ({
              friendAId: e.friendAId!,
              friendBId: e.friendBId!,
              intimacy: e.intimacy ?? 0,
            }));
          return [...prev, ...newEdges];
        });
      }
      return;
    }

    // 일반 친구 노드: 2-hop 추천 로드
    const result = await getTwoHopSuggestionsByAnchorAction(anchorId);
    if (result.success && result.data) {
      setSuggestionNodes(result.data);
      setSuggestionAnchorId(anchorId);
    }
  }

  async function handleSuggestionTap(suggestionId: number) {
    setMutualFriendIds([]);
    const result = await getTwoHopMutualFriendsAction(suggestionId);
    if (result.success && result.data) {
      setMutualFriendIds(result.data.map((r) => r.friendId ?? 0).filter(Boolean));
    }
  }

  const handleCyInit = useCallback((cy: any) => {
    cyRef.current = cy;
    cy.off("tap");

    cy.on("tap", (evt: any) => {
      if (evt.target === cy) {
        setSelectedNodeId(null);
        clearSuggestions();
      }
    });

    cy.on("tap", "node", (evt: any) => {
      const nodeType = evt.target.data("type");
      const rawId = String(evt.target.id());

      if (nodeType === "suggestion") {
        const sid = parseInt(rawId.replace("suggestion-", ""), 10);
        setSelectedNodeId(null);
        setSelectedSuggestionId(sid);
        setSuggestionSendStatus("idle");
        setSuggestionSendError(null);
        handleSuggestionTap(sid);
      } else {
        setSelectedSuggestionId(null);
        setSuggestionSendStatus("idle");
        setSuggestionSendError(null);
        setSelectedNodeId(rawId);
        handleAnchorTap(parseInt(rawId, 10));
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  function handleAliasUpdate(friendId: number, newAlias: string) {
    setFriendsList((prev) =>
      prev.map((f) =>
        f.friendId === friendId ? { ...f, friendAlias: newAlias } : f,
      ),
    );
    cyRef.current
      ?.getElementById(String(friendId))
      .data("label", newAlias || friendsList.find((f) => f.friendId === friendId)?.friendNickname || "");
  }

  function handleFriendUpdate(friendId: number, patch: Partial<FriendshipDetail>) {
    setFriendsList((prev) =>
      prev.map((f) => (f.friendId === friendId ? { ...f, ...patch } : f)),
    );
  }

  function handleFriendDelete(friendId: number) {
    setFriendsList((prev) => prev.filter((f) => f.friendId !== friendId));
    setEdges((prev) =>
      prev.filter(
        (e) => e.friendAId !== friendId && e.friendBId !== friendId,
      ),
    );
    setSelectedNodeId(null);
  }

  async function handleSuggestionSendRequest(receiverId: number) {
    setSuggestionSendStatus("loading");
    setSuggestionSendError(null);
    const result = await sendFriendRequestAction(receiverId);
    if (result.success) {
      setSuggestionSendStatus("sent");
    } else {
      setSuggestionSendStatus("error");
      setSuggestionSendError(result.message ?? "요청 전송에 실패했습니다.");
    }
  }

  async function handleCircleSizeSelect(size: GetFriendsNetworkCircleSize) {
    setCircleSize(size);
    setActiveLabelId(null);
    setIsLoading(true);
    clearSuggestions();
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
    clearSuggestions();
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

          {/* 탭 콘텐츠 */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {sidebarTab === "network" ? (
              <>
                <div className="p-5 border-b">
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

                <div className="p-4 space-y-2">
                  {!isGraphActive && (
                    <p className="text-xs text-gray-400 text-center py-2">
                      네트워크 범위를 선택하면 친구를 추가할 수 있습니다.
                    </p>
                  )}
                  {friendsList.map((friend) => {
                    const inGraph = graphNodeIds.has(String(friend.friendId));
                    return (
                      <div
                        key={friend.friendId}
                        className="flex items-center gap-3 p-2 bg-white rounded-lg shadow-sm border border-gray-100"
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0 overflow-hidden">
                          {friend.friendProfileImageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={friend.friendProfileImageUrl} alt="profile" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <p className="text-sm font-medium truncate flex-1">
                          {friend.friendAlias || friend.friendNickname}
                        </p>
                        {isGraphActive && !inGraph && (
                          <button
                            onClick={() => handleAddFriend(friend.friendId)}
                            className="shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 text-sm font-bold flex items-center justify-center transition"
                            title="그래프에 추가"
                          >
                            +
                          </button>
                        )}
                        {inGraph && (
                          <span className="shrink-0 w-2 h-2 rounded-full bg-indigo-400" title="그래프에 있음" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <LabelManager
                selectedNodeId={selectedNodeId}
                friends={friendsList}
                onLabelSelect={(id) => handleLabelSelect(id)}
                activeLabelId={activeLabelId}
              />
            )}
          </div>

          {/* 하단 패널 — FriendActionPanel(친구) 또는 SuggestionPanel(추천) */}
          {selectedFriend && !selectedSuggestion && (
            <FriendActionPanel
              friend={selectedFriend}
              onAliasUpdate={handleAliasUpdate}
              onMuteToggle={(id, val) => handleFriendUpdate(id, { isMuted: val })}
              onRoutableToggle={(id, val) => handleFriendUpdate(id, { isRoutable: val })}
              onDelete={handleFriendDelete}
              hasBuzzUnread={unreadBuzzSenderIds.includes(selectedFriend.friendId)}
            />
          )}
          {selectedSuggestion && (
            <SuggestionPanel
              suggestion={selectedSuggestion}
              sendStatus={suggestionSendStatus}
              sendError={suggestionSendError}
              onSendRequest={handleSuggestionSendRequest}
            />
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
