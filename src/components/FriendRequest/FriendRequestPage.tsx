"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { FriendRequestResult } from "@/api/model/friendRequestResult";
import { useFriendRequest, type RequestTabState } from "./useFriendRequest";
import { deriveCounterpartId, counterpartOf, loadingKey } from "./counterpart";
import EmptyState from "@/components/common/EmptyState";

type Tab = "received" | "sent" | "search";

interface FriendRequestPageProps {
  initialReceived: RequestTabState;
  initialSent: RequestTabState;
}

export default function FriendRequestPage({
  initialReceived,
  initialSent,
}: FriendRequestPageProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("received");

  const {
    receivedRequests,
    sentRequests,
    receivedOk,
    sentOk,
    searchEmail,
    setSearchEmail,
    searchStatus,
    searchResult,
    searchError,
    actionLoadingKey,
    actionError,
    handleSearch,
    handleAccept,
    handleHide,
    handleCancel,
  } = useFriendRequest({ initialReceived, initialSent });

  useEffect(() => {
    if (searchStatus === "found" && searchResult?.id) {
      router.push(`/users/${searchResult.id}`);
    }
  }, [searchStatus, searchResult, router]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.push("/")}
          className="text-gray-500 hover:text-indigo-600 transition-colors"
          aria-label="뒤로가기"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">친구 요청</h1>
      </header>

      {/* 탭 */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex px-6">
          <TabButton
            active={activeTab === "received"}
            onClick={() => setActiveTab("received")}
            label="받은 요청"
            count={receivedRequests.length}
          />
          <TabButton
            active={activeTab === "sent"}
            onClick={() => setActiveTab("sent")}
            label="보낸 요청"
            count={sentRequests.length}
          />
          <TabButton
            active={activeTab === "search"}
            onClick={() => setActiveTab("search")}
            label="친구 찾기"
          />
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {actionError && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            {actionError}
          </p>
        )}

        {activeTab === "received" && (
          <ReceivedTab
            requests={receivedRequests}
            ok={receivedOk}
            actionLoadingKey={actionLoadingKey}
            onAccept={handleAccept}
            onHide={handleHide}
          />
        )}

        {activeTab === "sent" && (
          <SentTab
            requests={sentRequests}
            ok={sentOk}
            actionLoadingKey={actionLoadingKey}
            onCancel={handleCancel}
          />
        )}

        {activeTab === "search" && (
          <SearchTab
            searchEmail={searchEmail}
            onEmailChange={setSearchEmail}
            onSearch={handleSearch}
            searchStatus={searchStatus}
            searchError={searchError}
          />
        )}
      </main>
    </div>
  );
}

// ─── 서브 컴포넌트 ───────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ${
        active
          ? "border-indigo-600 text-indigo-600"
          : "border-transparent text-gray-400 hover:text-gray-600"
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
          active ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500"
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

function TabError({ message }: { message: string }) {
  return (
    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
      {message}
    </p>
  );
}

function ReceivedTab({
  requests,
  ok,
  actionLoadingKey,
  onAccept,
  onHide,
}: {
  requests: FriendRequestResult[];
  ok: boolean;
  actionLoadingKey: string | null;
  onAccept: (requestId: string, counterpartId: number) => void;
  onHide: (requestId: string, counterpartId: number) => void;
}) {
  if (!ok) {
    return <TabError message="받은 요청을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." />;
  }
  if (requests.length === 0) {
    return <EmptyState message="받은 친구 요청이 없습니다." />;
  }

  return (
    <ul className="space-y-3">
      {requests.map((req) => {
        const person = counterpartOf(req, "RECEIVED");
        const counterpartId = deriveCounterpartId(req, "RECEIVED");
        const key = counterpartId != null ? loadingKey("RECEIVED", counterpartId) : null;
        const loading = key != null && actionLoadingKey === key;
        const disabled = counterpartId == null || loading;
        return (
          <li key={req.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <span className="text-indigo-700 font-bold text-sm">
                  {person?.nickname?.charAt(0) ?? "?"}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {person?.nickname ?? "알 수 없음"}
                </p>
                {counterpartId == null ? (
                  <p className="text-xs text-red-400 mt-0.5">사용자 정보를 확인할 수 없습니다.</p>
                ) : req.createdAt ? (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(req.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => counterpartId != null && onAccept(req.id!, counterpartId)}
                disabled={disabled}
                className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                수락
              </button>
              <button
                onClick={() => counterpartId != null && onHide(req.id!, counterpartId)}
                disabled={disabled}
                className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                숨기기
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function SentTab({
  requests,
  ok,
  actionLoadingKey,
  onCancel,
}: {
  requests: FriendRequestResult[];
  ok: boolean;
  actionLoadingKey: string | null;
  onCancel: (requestId: string, counterpartId: number) => void;
}) {
  if (!ok) {
    return <TabError message="보낸 요청을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." />;
  }
  if (requests.length === 0) {
    return <EmptyState message="보낸 친구 요청이 없습니다." />;
  }

  return (
    <ul className="space-y-3">
      {requests.map((req) => {
        const person = counterpartOf(req, "SENT");
        const counterpartId = deriveCounterpartId(req, "SENT");
        const key = counterpartId != null ? loadingKey("SENT", counterpartId) : null;
        const loading = key != null && actionLoadingKey === key;
        const disabled = counterpartId == null || loading;
        return (
          <li key={req.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                <span className="text-gray-600 font-bold text-sm">
                  {person?.nickname?.charAt(0) ?? "?"}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {person?.nickname ?? "알 수 없음"}
                </p>
                {counterpartId == null ? (
                  <p className="text-xs text-red-400 mt-0.5">사용자 정보를 확인할 수 없습니다.</p>
                ) : req.createdAt ? (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(req.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                ) : null}
              </div>
            </div>
            <button
              onClick={() => counterpartId != null && onCancel(req.id!, counterpartId)}
              disabled={disabled}
              className="text-xs px-3 py-1.5 bg-red-50 text-red-500 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed font-medium shrink-0"
            >
              취소
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function SearchTab({
  searchEmail,
  onEmailChange,
  onSearch,
  searchStatus,
  searchError,
}: {
  searchEmail: string;
  onEmailChange: (v: string) => void;
  onSearch: () => void;
  searchStatus: "idle" | "loading" | "found" | "not-found" | "error";
  searchError: string | null;
}) {
  return (
    <div className="space-y-4">
      {/* 검색 입력 */}
      <div className="flex gap-2">
        <input
          type="email"
          value={searchEmail}
          onChange={(e) => onEmailChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
          placeholder="이메일 주소 입력"
          className="flex-1 text-sm text-gray-900 placeholder-gray-400 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
        />
        <button
          onClick={onSearch}
          disabled={searchStatus === "loading" || !searchEmail.trim()}
          className="text-sm px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium shrink-0"
        >
          {searchStatus === "loading" ? "검색 중..." : "검색"}
        </button>
      </div>

      {/* 검색 실패 메시지 */}
      {(searchStatus === "not-found" || searchStatus === "error") && searchError && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {searchError}
        </p>
      )}
    </div>
  );
}
