"use client";

import Link from "next/link";
import type { AnchorExpansionResult } from "@/api/model/anchorExpansionResult";

interface SuggestionPanelProps {
  suggestion: AnchorExpansionResult;
  sendStatus: "idle" | "loading" | "sent" | "error";
  sendError: string | null;
  onSendRequest: (receiverId: number) => void;
}

export default function SuggestionPanel({
  suggestion,
  sendStatus,
  sendError,
  onSendRequest,
}: SuggestionPanelProps) {
  const displayName = suggestion.nickname ?? "알 수 없음";
  const mutualCount = suggestion.mutualCount ?? 0;

  return (
    <div className="border-t border-amber-200 bg-amber-50 p-4 shrink-0">
      {/* 추천인 정보 */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">추천</span>
          <p className="font-bold text-gray-800 text-sm truncate">{displayName}</p>
        </div>
        {mutualCount > 0 && (
          <p className="text-xs text-gray-500">공통 친구 {mutualCount}명</p>
        )}
      </div>

      {/* 친구 요청 버튼 */}
      {sendStatus === "sent" ? (
        <div className="w-full text-xs py-1.5 text-center text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 rounded-md">
          요청 완료 ✓
        </div>
      ) : (
        <button
          onClick={() => suggestion.id !== undefined && onSendRequest(suggestion.id)}
          disabled={sendStatus === "loading" || suggestion.id === undefined}
          className="w-full text-xs py-1.5 bg-amber-500 text-white rounded-md hover:bg-amber-600 disabled:opacity-50 font-medium transition-colors"
        >
          {sendStatus === "loading" ? "전송 중..." : "친구 요청 보내기"}
        </button>
      )}

      {sendStatus === "error" && sendError && (
        <p className="text-xs text-red-500 text-center mt-1.5">{sendError}</p>
      )}

      {suggestion.id !== undefined && (
        <Link
          href={`/users/${suggestion.id}`}
          className="mt-2 w-full text-xs py-1.5 flex items-center justify-center border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50 transition"
        >
          프로필 보기
        </Link>
      )}
    </div>
  );
}
