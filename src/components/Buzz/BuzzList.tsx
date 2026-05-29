"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BuzzSummaryResult } from "@/api/model/buzzSummaryResult";
import { getReceivedBuzzesAction } from "@/app/actions/buzz";

function remainingLabel(min?: number): { text: string; urgent: boolean } {
  if (min === undefined || min === null) return { text: "", urgent: false };
  if (min <= 0) return { text: "만료", urgent: true };
  if (min < 10) return { text: `${min}분 남음`, urgent: true };
  if (min < 60) return { text: `${min}분 남음`, urgent: false };
  const h = Math.floor(min / 60);
  return { text: `${h}시간 남음`, urgent: false };
}

interface BuzzListProps {
  initialBuzzes: BuzzSummaryResult[];
  initialHasMore: boolean;
}

export default function BuzzList({ initialBuzzes, initialHasMore }: BuzzListProps) {
  const router = useRouter();
  const [buzzes, setBuzzes] = useState<BuzzSummaryResult[]>(initialBuzzes);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  async function handleLoadMore() {
    setIsLoadingMore(true);
    const next = page + 1;
    const result = await getReceivedBuzzesAction(next);
    if (result.success && result.data) {
      setBuzzes((prev) => [...prev, ...(result.data!.content ?? [])]);
      setHasMore(!result.data.last);
      setPage(next);
    }
    setIsLoadingMore(false);
  }

  if (buzzes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m3 11 19-9-9 19-2-8-8-2z" />
        </svg>
        <p className="text-sm font-medium">받은 Buzz가 없습니다.</p>
      </div>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-gray-100">
        {buzzes.map((buzz) => {
          const { text: remText, urgent } = remainingLabel(buzz.remainingMinutes);
          return (
            <li key={buzz.buzzId}>
              <button
                onClick={() => router.push(`/buzzes/${buzz.buzzId}`)}
                className={`w-full text-left px-4 py-4 flex items-start gap-3 transition-colors hover:bg-gray-50 ${
                  buzz.isUnread ? "bg-orange-50" : "bg-white"
                }`}
              >
                {/* 미읽음 인디케이터 */}
                <div className="shrink-0 mt-1.5">
                  {buzz.isUnread ? (
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                  ) : (
                    <div className="w-2 h-2" />
                  )}
                </div>

                {/* 프로필 아바타 */}
                <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0 overflow-hidden">
                  {buzz.author?.profileImageUrl ? (
                    <img src={buzz.author.profileImageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-orange-700 font-bold text-sm">
                      {buzz.author?.nickname?.charAt(0) ?? "?"}
                    </span>
                  )}
                </div>

                {/* 내용 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-semibold truncate ${buzz.isUnread ? "text-gray-900" : "text-gray-700"}`}>
                      {buzz.author?.nickname ?? "알 수 없음"}
                    </p>
                    <span className={`text-xs shrink-0 ${urgent ? "text-red-500 font-bold" : "text-gray-400"}`}>
                      {remText}
                    </span>
                  </div>
                  {buzz.text && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{buzz.text}</p>
                  )}
                  <div className="flex gap-3 mt-1">
                    {(buzz.imageUrls?.length ?? 0) > 0 && (
                      <span className="text-xs text-gray-400">이미지 {buzz.imageUrls!.length}장</span>
                    )}
                    {(buzz.commentCount ?? 0) > 0 && (
                      <span className="text-xs text-gray-400">댓글 {buzz.commentCount}</span>
                    )}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {hasMore && (
        <div className="flex justify-center py-4">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="text-sm text-orange-600 font-medium hover:text-orange-800 disabled:opacity-50"
          >
            {isLoadingMore ? "불러오는 중..." : "더 보기"}
          </button>
        </div>
      )}
    </div>
  );
}
