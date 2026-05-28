import { useState } from "react";
import type { FriendRequestResult } from "@/api/model/friendRequestResult";
import type { UserProfileInfo } from "@/api/model/userProfileInfo";
import {
  searchUserByEmailAction,
  sendFriendRequestAction,
  acceptFriendRequestAction,
  hideFriendRequestAction,
  cancelFriendRequestAction,
} from "@/app/actions/friendRequest";

type SearchStatus = "idle" | "loading" | "found" | "not-found" | "error";

interface UseFriendRequestProps {
  initialReceived: FriendRequestResult[];
  initialSent: FriendRequestResult[];
}

export function useFriendRequest({ initialReceived, initialSent }: UseFriendRequestProps) {
  const [receivedRequests, setReceivedRequests] = useState<FriendRequestResult[]>(initialReceived);
  const [sentRequests, setSentRequests] = useState<FriendRequestResult[]>(initialSent);

  const [searchEmail, setSearchEmail] = useState("");
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const [searchResult, setSearchResult] = useState<UserProfileInfo | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
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
    if (result.success && result.data) {
      setSentRequests((prev) => [...prev, result.data!]);
      setSendStatus("sent");
    } else {
      setSendStatus("error");
      setSendError(result.message ?? "요청 전송에 실패했습니다.");
    }
  }

  async function handleAccept(requestId: string) {
    setActionLoadingId(requestId);
    setActionError(null);
    const result = await acceptFriendRequestAction(requestId);
    setActionLoadingId(null);
    if (result.success) {
      setReceivedRequests((prev) => prev.filter((r) => r.id !== requestId));
    } else {
      setActionError(result.message ?? "수락에 실패했습니다.");
    }
  }

  async function handleHide(requestId: string) {
    setActionLoadingId(requestId);
    setActionError(null);
    const result = await hideFriendRequestAction(requestId);
    setActionLoadingId(null);
    if (result.success) {
      setReceivedRequests((prev) => prev.filter((r) => r.id !== requestId));
    } else {
      setActionError(result.message ?? "숨기기에 실패했습니다.");
    }
  }

  async function handleCancel(requestId: string) {
    setActionLoadingId(requestId);
    setActionError(null);
    const result = await cancelFriendRequestAction(requestId);
    setActionLoadingId(null);
    if (result.success) {
      setSentRequests((prev) => prev.filter((r) => r.id !== requestId));
    } else {
      setActionError(result.message ?? "취소에 실패했습니다.");
    }
  }

  return {
    receivedRequests,
    sentRequests,
    searchEmail,
    setSearchEmail,
    searchStatus,
    searchResult,
    searchError,
    sendStatus,
    sendError,
    actionLoadingId,
    actionError,
    isAlreadySent,
    handleSearch,
    handleSendRequest,
    handleAccept,
    handleHide,
    handleCancel,
  };
}
