import { useState } from "react";
import type { FriendRequestResult } from "@/api/model/friendRequestResult";
import type { UserProfileInfo } from "@/api/model/userProfileInfo";
import {
  searchUserByEmailAction,
  sendFriendRequestAction,
  acceptFriendRequestAction,
  hideFriendRequestAction,
  cancelFriendRequestAction,
  getSentRequestsAction,
} from "@/app/actions/friendRequest";
import { loadingKey } from "./counterpart";

type SearchStatus = "idle" | "loading" | "found" | "not-found" | "error";

export interface RequestTabState {
  data: FriendRequestResult[];
  ok: boolean;
}

interface UseFriendRequestProps {
  initialReceived: RequestTabState;
  initialSent: RequestTabState;
}

export function useFriendRequest({ initialReceived, initialSent }: UseFriendRequestProps) {
  const [receivedRequests, setReceivedRequests] = useState<FriendRequestResult[]>(
    initialReceived.data,
  );
  const [sentRequests, setSentRequests] = useState<FriendRequestResult[]>(initialSent.data);
  const receivedOk = initialReceived.ok;
  const sentOk = initialSent.ok;

  const [searchEmail, setSearchEmail] = useState("");
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const [searchResult, setSearchResult] = useState<UserProfileInfo | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // 방향+counterpartId를 결합한 키. 서로 다른 탭의 동일 상대가 충돌하지 않는다.
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [sendStatus, setSendStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [sendError, setSendError] = useState<string | null>(null);

  async function handleSearch() {
    if (!searchEmail.trim()) return;
    setSearchStatus("loading");
    setSearchResult(null);
    setSearchError(null);
    setSendStatus("idle");
    setSendError(null);

    const result = await searchUserByEmailAction(searchEmail.trim());
    if (result.success) {
      setSearchResult(result.data);
      setSearchStatus("found");
    } else {
      setSearchStatus("not-found");
      setSearchError(result.message ?? "존재하지 않는 이메일입니다.");
    }
  }

  function isAlreadySent(userId: number): boolean {
    return sentRequests.some((r) => r.receiver?.id === userId);
  }

  async function handleSendRequest(receiverId: number) {
    setSendStatus("loading");
    setSendError(null);
    const result = await sendFriendRequestAction(receiverId);
    if (!result.success || !result.data) {
      setSendStatus("error");
      setSendError(result.message ?? "요청 전송에 실패했습니다.");
      return;
    }

    // receiver ID가 있어야 이후 counterpart mutation 대상이 된다.
    // 누락 시 낙관적 추가 대신 보낸 목록을 재조회해 정합성을 확보한다.
    if (result.data.receiver?.id != null) {
      setSentRequests((prev) => [...prev, result.data!]);
    } else {
      const refetched = await getSentRequestsAction();
      if (refetched.success) setSentRequests(refetched.data);
    }
    setSendStatus("sent");
  }

  /** 받은 요청 수락: counterpartId(=requester.id)로 상태 전이 후 카드 제거. */
  async function handleAccept(requestId: string, counterpartId: number) {
    const key = loadingKey("RECEIVED", counterpartId);
    if (actionLoadingKey === key) return; // 중복 클릭 차단
    setActionLoadingKey(key);
    setActionError(null);
    const result = await acceptFriendRequestAction(counterpartId);
    setActionLoadingKey(null);
    if (result.success) {
      setReceivedRequests((prev) => prev.filter((r) => r.id !== requestId));
    } else {
      setActionError(result.message ?? "수락에 실패했습니다.");
    }
  }

  /** 받은 요청 숨김. */
  async function handleHide(requestId: string, counterpartId: number) {
    const key = loadingKey("RECEIVED", counterpartId);
    if (actionLoadingKey === key) return;
    setActionLoadingKey(key);
    setActionError(null);
    const result = await hideFriendRequestAction(counterpartId);
    setActionLoadingKey(null);
    if (result.success) {
      setReceivedRequests((prev) => prev.filter((r) => r.id !== requestId));
    } else {
      setActionError(result.message ?? "숨기기에 실패했습니다.");
    }
  }

  /** 보낸 요청 취소: counterpartId(=receiver.id)로 취소 후 카드 제거. */
  async function handleCancel(requestId: string, counterpartId: number) {
    const key = loadingKey("SENT", counterpartId);
    if (actionLoadingKey === key) return;
    setActionLoadingKey(key);
    setActionError(null);
    const result = await cancelFriendRequestAction(counterpartId);
    setActionLoadingKey(null);
    if (result.success) {
      setSentRequests((prev) => prev.filter((r) => r.id !== requestId));
    } else {
      setActionError(result.message ?? "취소에 실패했습니다.");
    }
  }

  return {
    receivedRequests,
    sentRequests,
    receivedOk,
    sentOk,
    searchEmail,
    setSearchEmail,
    searchStatus,
    searchResult,
    searchError,
    sendStatus,
    sendError,
    actionLoadingKey,
    actionError,
    isAlreadySent,
    handleSearch,
    handleSendRequest,
    handleAccept,
    handleHide,
    handleCancel,
  };
}
