"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { FlagDetailResult } from "@/api/model/flagDetailResult";
import {
  closeRecruitmentAction,
  deleteFlagAction,
  participateAction,
  leaveAction,
} from "@/app/actions/flag";

function formatDateTime(dt?: string): string {
  if (!dt) return "-";
  return new Date(dt).toLocaleString("ko-KR", {
    year: "numeric", month: "numeric", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function remainingLabel(endDateTime?: string): string {
  if (!endDateTime) return "";
  const diff = new Date(endDateTime).getTime() - Date.now();
  if (diff <= 0) return "종료됨";
  const h = Math.floor(diff / 3600000);
  if (h < 24) return `${h}시간 남음`;
  return `D-${Math.floor(h / 24)}`;
}

interface FlagDetailProps {
  flag: FlagDetailResult;
  myUserId?: number;
}

export default function FlagDetail({ flag, myUserId }: FlagDetailProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isHost = !!myUserId && flag.host?.id === myUserId;
  const isParticipating = !!myUserId && (flag.participants ?? []).some((p) => p.id === myUserId);
  const isClosed = flag.status === "CLOSED";
  const rem = remainingLabel(flag.schedule?.endDateTime);

  async function handle(action: () => Promise<{ success: boolean; message?: string }>, afterPush?: string) {
    setIsLoading(true);
    setActionError(null);
    const result = await action();
    setIsLoading(false);
    if (result.success) {
      if (afterPush) router.push(afterPush);
      else router.refresh();
    } else {
      setActionError(result.message ?? "오류가 발생했습니다.");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            {flag.parentFlagId && (
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">Encore</span>
            )}
            {isClosed && (
              <span className="text-xs font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">마감됨</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {rem && <span className="text-xs text-gray-400 font-medium">{rem}</span>}
          {isHost && (
            <Link
              href={`/flags/new?parentFlagId=${flag.id}`}
              className="text-xs px-2.5 py-1 border border-indigo-200 rounded-lg text-indigo-600 hover:bg-indigo-50"
            >
              Encore
            </Link>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* 본문 */}
        <div className="bg-white px-4 py-5 border-b">
          <h1 className="text-lg font-bold text-gray-900 mb-1">{flag.title}</h1>
          {flag.description && (
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{flag.description}</p>
          )}
        </div>

        {/* 이전 Flag */}
        {flag.parentFlag && (
          <div className="bg-indigo-50 px-4 py-3 border-b flex items-center justify-between">
            <p className="text-xs text-indigo-700 font-medium">
              원본 Flag: {flag.parentFlag.title}
            </p>
            <Link href={`/flags/${flag.parentFlag.id}`} className="text-xs text-indigo-600 underline">
              보기
            </Link>
          </div>
        )}

        {/* 일정 + 정원 */}
        <div className="bg-white px-4 py-4 border-b space-y-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">일정</p>
          <div className="space-y-1 text-sm text-gray-700">
            <div className="flex gap-2">
              <span className="text-gray-400 w-14 shrink-0">시작</span>
              <span>{formatDateTime(flag.schedule?.startDateTime)}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-400 w-14 shrink-0">종료</span>
              <span>{formatDateTime(flag.schedule?.endDateTime)}</span>
            </div>
            {flag.schedule?.deadline && (
              <div className="flex gap-2">
                <span className="text-gray-400 w-14 shrink-0">모집 마감</span>
                <span>{formatDateTime(flag.schedule.deadline)}</span>
              </div>
            )}
            <div className="flex gap-2">
              <span className="text-gray-400 w-14 shrink-0">정원</span>
              <span>
                {flag.participantCount ?? 0}
                {flag.capacity ? `/${flag.capacity}명` : "명 참여 중"}
              </span>
            </div>
          </div>
        </div>

        {/* 주최자 */}
        {flag.host && (
          <div className="bg-white px-4 py-4 border-b flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
              {flag.host.profileImageUrl ? (
                <img src={flag.host.profileImageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-indigo-700 font-bold text-sm">{flag.host.nickname?.charAt(0) ?? "?"}</span>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-400">주최자</p>
              <p className="text-sm font-semibold text-gray-800">{flag.host.nickname}</p>
            </div>
          </div>
        )}

        {/* 참여자 목록 */}
        {(flag.participants?.length ?? 0) > 0 && (
          <div className="bg-white px-4 py-4 border-b">
            <p className="text-xs font-bold text-gray-500 mb-3">참여자 {flag.participants!.length}명</p>
            <div className="flex flex-wrap gap-3">
              {flag.participants!.map((p) => (
                <div key={p.id} className="flex flex-col items-center gap-1">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                    {p.profileImageUrl ? (
                      <img src={p.profileImageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-500 font-bold text-sm">{p.nickname?.charAt(0) ?? "?"}</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-600 max-w-12 truncate">{p.nickname}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 액션 버튼 */}
      <div className="bg-white border-t border-gray-200 px-4 py-4 shrink-0">
        {actionError && <p className="text-xs text-red-500 mb-2">{actionError}</p>}
        <div className="flex gap-2 max-w-lg mx-auto">
          {isHost && (
            <>
              {!isClosed && (
                <button
                  disabled={isLoading}
                  onClick={() => handle(() => closeRecruitmentAction(flag.id!))}
                  className="flex-1 py-2.5 text-sm font-medium border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  모집 마감
                </button>
              )}
              <button
                disabled={isLoading}
                onClick={() => handle(() => deleteFlagAction(flag.id!), "/flags")}
                className="flex-1 py-2.5 text-sm font-medium border border-red-200 rounded-xl text-red-500 hover:bg-red-50 disabled:opacity-50"
              >
                삭제
              </button>
            </>
          )}
          {isParticipating && !isHost && (
            <button
              disabled={isLoading}
              onClick={() => handle(() => leaveAction(flag.id!))}
              className="flex-1 py-2.5 text-sm font-medium border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              참여 취소
            </button>
          )}
          {!isHost && !isParticipating && (
            <button
              disabled={isLoading || isClosed}
              onClick={() => handle(() => participateAction(flag.id!))}
              className="flex-1 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isClosed ? "모집 마감됨" : "참여하기"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
