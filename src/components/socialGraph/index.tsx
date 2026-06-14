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
import { useGraphZoom } from "./useGraphZoom";
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
import type { Label } from "@/components/Label/types";

type SidebarTab = "network" | "label";
type SuggestionSendStatus = "idle" | "loading" | "sent" | "error";

const CIRCLE_SIZE_LABELS: Record<GetFriendsNetworkCircleSize, string> = {
  SUPPORT: "SUPPORT",
  SYMPATHY: "SYMPATHY",
  KINSHIP: "KINSHIP",
  DUNBAR: "DUNBAR",
};

const CIRCLE_SIZE_ORDER: GetFriendsNetworkCircleSize[] = [
  GetFriendsNetworkCircleSize.SUPPORT,
  GetFriendsNetworkCircleSize.SYMPATHY,
  GetFriendsNetworkCircleSize.KINSHIP,
  GetFriendsNetworkCircleSize.DUNBAR,
];

interface SocialGraphProps {
  friends: FriendshipDetail[];
  initialLabels?: Label[];
  unreadBuzzSenderIds?: number[];
}

export default function SocialGraph({
  friends,
  initialLabels = [],
  unreadBuzzSenderIds = [],
}: SocialGraphProps) {
  const router = useRouter();
  const [friendsList, setFriendsList] = useState<FriendshipDetail[]>(friends);
  const [edges, setEdges] = useState<NetworkFriendEdge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGraphActive, setIsGraphActive] = useState(false);
  const [layoutType, setLayoutType] = useState<LayoutType>("intimacy");

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("network");
  const [circleSize, setCircleSize] =
    useState<GetFriendsNetworkCircleSize | null>(null);
  const [activeLabelId, setActiveLabelId] = useState<string | null>(null);
  const [isNetworkOpen, setIsNetworkOpen] = useState(true);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isLabelThemeOpen, setIsLabelThemeOpen] = useState(false);

  const [circleNodeIds, setCircleNodeIds] = useState<number[]>([]);

  // 수동 추가/숨김 노드
  const [manuallyAddedIds, setManuallyAddedIds] = useState<Set<number>>(
    new Set(),
  );
  const [manuallyHiddenIds, setManuallyHiddenIds] = useState<Set<number>>(
    new Set(),
  );

  // 2-hop 추천 state
  const [suggestionNodes, setSuggestionNodes] = useState<
    AnchorExpansionResult[]
  >([]);
  const [suggestionAnchorId, setSuggestionAnchorId] = useState<number | null>(
    null,
  );
  const [suggestionAnchorPos, setSuggestionAnchorPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [mutualFriendIds, setMutualFriendIds] = useState<number[]>([]);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<
    number | null
  >(null);
  const [suggestionSendStatus, setSuggestionSendStatus] =
    useState<SuggestionSendStatus>("idle");
  const [suggestionSendError, setSuggestionSendError] = useState<string | null>(
    null,
  );

  const cyRef = useRef<cytoscape.Core | null>(null);
  const { zoomFit, zoomToNode } = useGraphZoom(cyRef);

  const elements = useGraphData({
    friends: friendsList,
    edges,
    circleNodeIds,
    layoutType,
    suggestionNodes,
    suggestionAnchorId,
    suggestionAnchorPos,
    mutualFriendIds,
    selectedSuggestionId,
    unreadBuzzSenderIds,
    manuallyAddedIds,
    manuallyHiddenIds,
  });

  // "그래프에 있는 친구" = circleSize 노드(숨김 제외) + 수동 추가
  // circleNodeIds가 없으면(라벨 네트워크) 엣지 기반으로 폴백
  const graphNodeIds = useMemo(() => {
    const ids = new Set<string>();
    if (circleNodeIds.length > 0) {
      circleNodeIds.forEach((id) => {
        if (!manuallyHiddenIds.has(id)) ids.add(String(id));
      });
    } else {
      edges.forEach((e) => {
        if (!manuallyHiddenIds.has(e.friendAId)) ids.add(String(e.friendAId));
        if (!manuallyHiddenIds.has(e.friendBId)) ids.add(String(e.friendBId));
      });
    }
    manuallyAddedIds.forEach((id) => ids.add(String(id)));
    return ids;
  }, [circleNodeIds, edges, manuallyAddedIds, manuallyHiddenIds]);

  const sortedFriendsList = useMemo(
    () =>
      [...friendsList].sort((a, b) =>
        (a.friendAlias || a.friendNickname).localeCompare(
          b.friendAlias || b.friendNickname,
          "ko",
        ),
      ),
    [friendsList],
  );

  const selectedFriend =
    friendsList.find((f) => String(f.friendId) === selectedNodeId) ?? null;

  const selectedSuggestion =
    selectedSuggestionId !== null
      ? (suggestionNodes.find((s) => s.id === selectedSuggestionId) ?? null)
      : null;

  const CY_STYLE = useMemo(() => ({ width: "100%", height: "100%" }), []);

  const memoizedLayout = useMemo(
    () => getLayoutOptions(layoutType, false, circleSize),
    [layoutType, circleSize],
  );

  const memoizedStylesheet = useMemo(
    () => getGraphStylesheet(layoutType),
    [layoutType],
  );

  function clearSuggestions() {
    setSuggestionNodes([]);
    setSuggestionAnchorId(null);
    setSuggestionAnchorPos(null);
    setMutualFriendIds([]);
    setSelectedSuggestionId(null);
    setSuggestionSendStatus("idle");
    setSuggestionSendError(null);
  }

  async function handleAddToGraph(friendId: number) {
    if (manuallyHiddenIds.has(friendId)) {
      // 숨김 해제: circleSize 노드 복원 — 엣지는 이미 edges state에 존재
      setManuallyHiddenIds((prev) => {
        const next = new Set(prev);
        next.delete(friendId);
        return next;
      });
    } else {
      // 신규 수동 추가: 현재 스켈레톤과의 접점 자동 로드 + 바로 하이라이트
      setManuallyAddedIds((prev) => new Set(prev).add(friendId));
      setSelectedNodeId(String(friendId));
      const skeletonIds = [...graphNodeIds].map(Number);
      const result = await getOneHopMutualFriendEdgesAction(
        friendId,
        skeletonIds,
      );
      if (result.success && result.data.length > 0) {
        setEdges((prev) => {
          const existingIds = new Set(
            prev.map(
              (e) =>
                `${Math.min(e.friendAId, e.friendBId)}-${Math.max(e.friendAId, e.friendBId)}`,
            ),
          );
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
    }
  }

  function handleRemoveFromGraph(friendId: number) {
    if (manuallyAddedIds.has(friendId)) {
      setManuallyAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(friendId);
        return next;
      });
    } else {
      setManuallyHiddenIds((prev) => new Set(prev).add(friendId));
    }
  }

  function handleFriendListClick(friendId: number) {
    clearSuggestions();
    setSelectedNodeId(String(friendId));
  }

  async function handleAnchorTap(anchorId: number) {
    setMutualFriendIds([]);
    setSelectedSuggestionId(null);
    setSuggestionSendStatus("idle");
    setSuggestionSendError(null);

    const result = await getTwoHopSuggestionsByAnchorAction(anchorId);
    if (result.success && result.data && result.data.length > 0) {
      const anchorNode = cyRef.current?.getElementById(String(anchorId));
      if (anchorNode && anchorNode.length > 0) {
        setSuggestionAnchorPos({ ...anchorNode.position() });
      }
      setSuggestionNodes(result.data);
      setSuggestionAnchorId(anchorId);
    }
  }

  async function handleSuggestionTap(suggestionId: number) {
    setMutualFriendIds([]);
    const skeletonIds = [...graphNodeIds].map(Number);
    const result = await getTwoHopMutualFriendsAction(
      suggestionId,
      skeletonIds,
    );
    if (result.success && result.data) {
      setMutualFriendIds(
        result.data.map((r) => r.friendId ?? 0).filter(Boolean),
      );
    }
  }

  // handleCyInit은 mount 시 한 번만 생성되므로 최신 함수를 ref로 유지
  const handleSuggestionTapRef = useRef(handleSuggestionTap);
  useEffect(() => {
    handleSuggestionTapRef.current = handleSuggestionTap;
  });

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
        handleSuggestionTapRef.current(sid);
      } else {
        setSelectedSuggestionId(null);
        setSuggestionSendStatus("idle");
        setSuggestionSendError(null);
        clearSuggestions();
        setSelectedNodeId(rawId);
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
      cy.elements()
        .difference(node.neighborhood().union(node))
        .addClass("faded");
      node.addClass("highlighted");
      node.neighborhood("node").addClass("highlighted");
      node.connectedEdges().addClass("visible");

      zoomToNode(selectedNodeId);
    }, 100);

    return () => clearTimeout(timer);
  }, [selectedNodeId, edges, layoutType, zoomToNode]);

  function handleAliasUpdate(friendId: number, newAlias: string) {
    setFriendsList((prev) =>
      prev.map((f) =>
        f.friendId === friendId ? { ...f, friendAlias: newAlias } : f,
      ),
    );
    const nickname =
      friendsList.find((f) => f.friendId === friendId)?.friendNickname || "";
    const label =
      newAlias && newAlias !== nickname
        ? `${newAlias}\n${nickname}`
        : nickname;
    cyRef.current?.getElementById(String(friendId)).data("label", label);
  }

  function handleFriendUpdate(
    friendId: number,
    patch: Partial<FriendshipDetail>,
  ) {
    setFriendsList((prev) =>
      prev.map((f) => (f.friendId === friendId ? { ...f, ...patch } : f)),
    );
  }

  function handleFriendDelete(friendId: number) {
    setFriendsList((prev) => prev.filter((f) => f.friendId !== friendId));
    setEdges((prev) =>
      prev.filter((e) => e.friendAId !== friendId && e.friendBId !== friendId),
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
    setIsGraphActive(false);
    setManuallyAddedIds(new Set());
    setManuallyHiddenIds(new Set());
    setCircleNodeIds([]);
    setSelectedNodeId(null);
    clearSuggestions();
    try {
      const result = await getFriendsNetworkAction(size);
      if (result.success && result.data) {
        setEdges(result.data.edges);
        setCircleNodeIds(result.data.nodeIds);
        setIsGraphActive(true);
      }
    } catch {
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLabelMemberAdd(friendId: number) {
    if (!activeLabelId) return;

    // 노드 즉시 추가 + 현재 스냅샷 캡처 (클로저 타이밍 문제 방지)
    let snapshotIds: number[] = [];
    setCircleNodeIds((prev) => {
      if (prev.includes(friendId)) { snapshotIds = prev; return prev; }
      snapshotIds = prev;
      return [...prev, friendId];
    });

    const result = await getOneHopMutualFriendEdgesAction(friendId, snapshotIds);
    if (result.success && result.data.length > 0) {
      setEdges((prev) => {
        const existingIds = new Set(
          prev.map((e) => `${Math.min(e.friendAId, e.friendBId)}-${Math.max(e.friendAId, e.friendBId)}`),
        );
        const newEdges = result.data
          .filter((e) => e.friendAId != null && e.friendBId != null)
          .filter((e) => {
            const key = `${Math.min(e.friendAId!, e.friendBId!)}-${Math.max(e.friendAId!, e.friendBId!)}`;
            return !existingIds.has(key);
          })
          .map((e) => ({ friendAId: e.friendAId!, friendBId: e.friendBId!, intimacy: e.intimacy ?? 0 }));
        return [...prev, ...newEdges];
      });
    }
  }

  function handleLabelMemberRemove(memberId: number) {
    if (!activeLabelId) return;
    setCircleNodeIds((prev) => prev.filter((id) => id !== memberId));
    setEdges((prev) => prev.filter((e) => e.friendAId !== memberId && e.friendBId !== memberId));
  }

  async function handleLabelSelect(labelId: string | null, memberIds: number[] = []) {
    setActiveLabelId(labelId);
    if (!labelId) return;

    setCircleSize(null);
    setIsLoading(true);
    setIsGraphActive(false);
    setManuallyAddedIds(new Set());
    setManuallyHiddenIds(new Set());
    setCircleNodeIds([]);
    setSelectedNodeId(null);
    clearSuggestions();
    try {
      const result = await getLabelNetworkAction(labelId);
      if (result.success && result.data) {
        const { edges: labelEdges, nodeIds } = result.data;
        setEdges(labelEdges);
        // nodeIds(엣지 렌더링 기준) + memberIds 중 그래프에 없는 고립 멤버까지 합산
        const nodeIdSet = new Set(nodeIds);
        const isolatedMemberIds = memberIds.filter((id) => !nodeIdSet.has(id));
        setCircleNodeIds([...nodeIds, ...isolatedMemberIds]);
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
              TOP-N
            </button>
            <button
              onClick={() => setSidebarTab("label")}
              className={`flex-1 py-3 text-sm font-bold transition border-b-2 ${
                sidebarTab === "label"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              라벨
            </button>
          </div>

          {/* 탭 콘텐츠 */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {sidebarTab === "network" ? (
              <>
                {/* 네트워크 범위 아코디언 */}
                <div className="border-b">
                  <button
                    onClick={() => setIsNetworkOpen((v) => !v)}
                    className="w-full flex items-center justify-between px-5 py-3 text-xs font-bold text-gray-500 hover:text-gray-700 transition"
                  >
                    네트워크 범위
                    <svg
                      className={`w-4 h-4 transition-transform ${isNetworkOpen ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {isNetworkOpen && (
                    <div className="px-5 pb-4">
                      <div className="grid grid-cols-4 gap-1.5">
                        {CIRCLE_SIZE_ORDER.map((size) => (
                          <button
                            key={size}
                            onClick={() => handleCircleSizeSelect(size)}
                            disabled={isLoading}
                            className={`py-1.5 text-xs font-bold rounded-lg transition ${
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
                  )}
                </div>

                {/* 렌더링 테마 아코디언 */}
                <div className="border-b">
                  <button
                    onClick={() => setIsThemeOpen((v) => !v)}
                    className="w-full flex items-center justify-between px-5 py-3 text-xs font-bold text-gray-500 hover:text-gray-700 transition"
                  >
                    <span>
                      렌더링 테마
                      <span className="ml-2 font-normal text-indigo-500">
                        {layoutType === "connectivity"
                          ? "연결성"
                          : layoutType === "intimacy"
                            ? "친밀도"
                            : "관심도"}
                      </span>
                    </span>
                    <svg
                      className={`w-4 h-4 transition-transform ${isThemeOpen ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {isThemeOpen && (
                    <div className="px-5 pb-4">
                      <div className="flex gap-1 bg-gray-200 p-1 rounded-lg">
                        {(
                          [
                            "intimacy",
                            "connectivity",
                            "interest",
                          ] as LayoutType[]
                        ).map((theme) => (
                          <button
                            key={theme}
                            onClick={() => setLayoutType(theme)}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${
                              layoutType === theme
                                ? "bg-white shadow text-indigo-700"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                          >
                            {theme === "connectivity"
                              ? "연결성"
                              : theme === "intimacy"
                                ? "친밀도"
                                : "관심도"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-2">
                  {!isGraphActive && (
                    <p className="text-xs text-gray-400 text-center py-2">
                      네트워크 범위를 선택하면 친구를 추가할 수 있습니다.
                    </p>
                  )}
                  {sortedFriendsList.map((friend) => {
                    const inGraph = graphNodeIds.has(String(friend.friendId));
                    const isSelected =
                      selectedNodeId === String(friend.friendId);
                    return (
                      <div
                        key={friend.friendId}
                        onClick={() => handleFriendListClick(friend.friendId)}
                        className={`flex items-center gap-3 p-2 rounded-lg shadow-sm border cursor-pointer transition ${
                          isSelected
                            ? "bg-indigo-50 border-indigo-300"
                            : "bg-white border-gray-100 hover:bg-gray-50"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0 overflow-hidden">
                          {friend.friendProfileImageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={friend.friendProfileImageUrl}
                              alt="profile"
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          {friend.friendAlias && friend.friendAlias !== friend.friendNickname ? (
                            <p className="text-sm font-medium truncate text-gray-800">
                              {friend.friendAlias}{" "}
                              <span className="text-xs font-normal text-gray-400">{friend.friendNickname}</span>
                            </p>
                          ) : (
                            <p className="text-sm font-medium truncate text-gray-800">
                              {friend.friendNickname}
                            </p>
                          )}
                        </div>
                        {isGraphActive && inGraph && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFromGraph(friend.friendId);
                            }}
                            className="shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-500 hover:bg-red-200 text-sm font-bold flex items-center justify-center transition"
                            title="그래프에서 제거"
                          >
                            −
                          </button>
                        )}
                        {isGraphActive && !inGraph && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToGraph(friend.friendId);
                            }}
                            className="shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 text-sm font-bold flex items-center justify-center transition"
                            title="그래프에 추가"
                          >
                            +
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                {/* 라벨 탭 — 렌더링 테마 아코디언 */}
                <div className="border-b">
                  <button
                    onClick={() => setIsLabelThemeOpen((v) => !v)}
                    className="w-full flex items-center justify-between px-5 py-3 text-xs font-bold text-gray-500 hover:text-gray-700 transition"
                  >
                    <span>
                      렌더링 테마
                      <span className="ml-2 font-normal text-indigo-500">
                        {layoutType === "connectivity" ? "연결성" : layoutType === "intimacy" ? "친밀도" : "관심도"}
                      </span>
                    </span>
                    <svg
                      className={`w-4 h-4 transition-transform ${isLabelThemeOpen ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isLabelThemeOpen && (
                    <div className="px-5 pb-4">
                      <div className="flex gap-1 bg-gray-200 p-1 rounded-lg">
                        {(["intimacy", "connectivity", "interest"] as LayoutType[]).map((theme) => (
                          <button
                            key={theme}
                            onClick={() => setLayoutType(theme)}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${
                              layoutType === theme
                                ? "bg-white shadow text-indigo-700"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                          >
                            {theme === "connectivity" ? "연결성" : theme === "intimacy" ? "친밀도" : "관심도"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <LabelManager
                  initialLabels={initialLabels}
                  friends={friendsList}
                  onLabelSelect={(id, memberIds) => handleLabelSelect(id, memberIds)}
                  activeLabelId={activeLabelId}
                  onMemberAdd={handleLabelMemberAdd}
                  onMemberRemove={handleLabelMemberRemove}
                />
              </>
            )}
          </div>

          {/* 하단 패널 — FriendActionPanel(친구) 또는 SuggestionPanel(추천) */}
          {selectedFriend && !selectedSuggestion && (
            <FriendActionPanel
              friend={selectedFriend}
              onAliasUpdate={handleAliasUpdate}
              onMuteToggle={(id, val) =>
                handleFriendUpdate(id, { isMuted: val })
              }
              onRoutableToggle={(id, val) =>
                handleFriendUpdate(id, { isRoutable: val })
              }
              onDelete={handleFriendDelete}
              hasBuzzUnread={unreadBuzzSenderIds.includes(
                selectedFriend.friendId,
              )}
              onSuggestRequest={() => handleAnchorTap(selectedFriend.friendId)}
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
        {isGraphActive && (
          <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1">
            <button
              onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.2)}
              className="w-8 h-8 bg-white border border-gray-200 rounded-lg shadow text-gray-600 hover:text-indigo-600 hover:border-indigo-300 flex items-center justify-center text-lg font-bold transition"
              title="줌 인"
            >
              +
            </button>
            <button
              onClick={() => cyRef.current?.zoom(cyRef.current.zoom() / 1.2)}
              className="w-8 h-8 bg-white border border-gray-200 rounded-lg shadow text-gray-600 hover:text-indigo-600 hover:border-indigo-300 flex items-center justify-center text-lg font-bold transition"
              title="줌 아웃"
            >
              −
            </button>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
            <p className="font-bold text-gray-700">관계망을 계산 중입니다...</p>
          </div>
        )}

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
          onLayoutStop={zoomFit}
        />
      </main>
    </div>
  );
}
