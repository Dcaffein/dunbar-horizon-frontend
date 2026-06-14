"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { FriendshipDetail } from "@/components/socialGraph/types";

interface FriendActionPanelProps {
  friend: FriendshipDetail;
  hasBuzzUnread?: boolean;
  onSuggestRequest?: () => void;
}

export default function FriendActionPanel({
  friend,
  hasBuzzUnread = false,
  onSuggestRequest,
}: FriendActionPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    setIsExpanded(true);
  }, [friend.friendId]);

  const displayName = friend.friendAlias || friend.friendNickname;

  return (
    <div className="border-t-2 border-indigo-300 bg-indigo-50 shrink-0 shadow-[0_-4px_12px_rgba(99,102,241,0.12)]">
      {/* 헤더 — 항상 표시 */}
      <div className="flex items-center justify-between px-4 py-2">
        <p className="font-bold text-gray-800 text-sm truncate">{displayName}</p>
        <button
          onClick={() => setIsExpanded((v) => !v)}
          className="ml-2 shrink-0 text-gray-400 hover:text-indigo-600 transition-colors"
          aria-label={isExpanded ? "패널 접기" : "패널 펼치기"}
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-0" : "rotate-180"}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* 본문 — 접힐 때 숨김 */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-2">
          {hasBuzzUnread && (
            <Link
              href="/buzzes"
              className="flex items-center justify-center gap-1.5 w-full text-xs py-1.5 bg-orange-500 text-white rounded-md hover:bg-orange-600 font-medium"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Buzz 확인
            </Link>
          )}

          {onSuggestRequest && (
            <button
              onClick={onSuggestRequest}
              className="w-full text-xs py-1.5 border border-indigo-200 rounded-md text-indigo-600 hover:bg-indigo-50 transition"
            >
              친구 추천받기
            </button>
          )}

          <Link
            href={`/users/${friend.friendId}`}
            className="flex items-center justify-center w-full text-xs py-1.5 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50"
          >
            프로필 보기
          </Link>
        </div>
      )}
    </div>
  );
}
