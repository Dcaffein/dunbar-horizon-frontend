"use client";

import Link from "next/link";
import { useFriendActionPanel } from "./useFriendActionPanel";
import type { FriendshipDetail } from "@/components/socialGraph/types";

interface FriendActionPanelProps {
  friend: FriendshipDetail;
  onAliasUpdate: (friendId: number, newAlias: string) => void;
  onMuteToggle: (friendId: number, newValue: boolean) => void;
  onRoutableToggle: (friendId: number, newValue: boolean) => void;
  onDelete: (friendId: number) => void;
  hasBuzzUnread?: boolean;
}

export default function FriendActionPanel({
  friend,
  onAliasUpdate,
  onMuteToggle,
  onRoutableToggle,
  onDelete,
  hasBuzzUnread = false,
}: FriendActionPanelProps) {
  const {
    aliasInput,
    setAliasInput,
    isLoading,
    error,
    handleSaveAlias,
    handleMuteToggle,
    handleRoutableToggle,
    handleDelete,
  } = useFriendActionPanel({
    friend,
    onAliasUpdate,
    onMuteToggle,
    onRoutableToggle,
    onDelete,
  });

  const displayName = friend.friendAlias || friend.friendNickname;
  const isRoutable = friend.isRoutable ?? true;

  return (
    <div className="border-t border-gray-200 bg-white p-4 shrink-0">
      {/* 친구 이름 */}
      <div className="mb-3">
        <p className="font-bold text-gray-800 text-sm truncate">{displayName}</p>
      </div>

      <div className="space-y-2">
        {/* Buzz 확인 버튼 */}
        {hasBuzzUnread && (
          <Link
            href="/buzzes"
            className="flex items-center justify-center gap-1.5 w-full text-xs py-1.5 bg-orange-500 text-white rounded-md hover:bg-orange-600 font-medium"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Buzz 확인
          </Link>
        )}

        {/* 별칭 변경 */}
        <div className="flex gap-1.5">
          <input
            type="text"
            value={aliasInput}
            onChange={(e) => setAliasInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveAlias()}
            placeholder="별칭"
            disabled={isLoading}
            className="flex-1 text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-indigo-400 disabled:opacity-50"
          />
          <button
            onClick={handleSaveAlias}
            disabled={isLoading}
            className="text-xs px-2.5 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 shrink-0"
          >
            저장
          </button>
        </div>

        {/* 음소거 */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">음소거</span>
          <button
            onClick={handleMuteToggle}
            disabled={isLoading}
            className={`relative w-9 h-5 rounded-full transition-colors disabled:opacity-50 ${
              friend.isMuted ? "bg-indigo-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                friend.isMuted ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* 추천 경유 허용 */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">추천 경유 허용</span>
          <button
            onClick={handleRoutableToggle}
            disabled={isLoading}
            className={`relative w-9 h-5 rounded-full transition-colors disabled:opacity-50 ${
              isRoutable ? "bg-indigo-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                isRoutable ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* 프로필 보기 */}
        <Link
          href={`/friends/${friend.friendId}`}
          className="flex items-center justify-center w-full text-xs py-1.5 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50"
        >
          프로필 보기
        </Link>

        {/* 친구 삭제 */}
        <button
          onClick={handleDelete}
          disabled={isLoading}
          className="w-full text-xs py-1.5 text-red-500 border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-50 mt-1"
        >
          친구 삭제
        </button>

        {/* 에러 */}
        {error && (
          <p className="text-xs text-red-500 text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
