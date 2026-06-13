"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FlagResult } from "@/api/model/flagResult";
import {
  closeRecruitmentAction,
  deleteFlagAction,
  participateAction,
  leaveAction,
} from "@/app/actions/flag";

type Tab = "browse" | "hosting" | "participating";

const TAB_LABELS: Record<Tab, string> = {
  browse: "둘러보기",
  hosting: "호스팅",
  participating: "참여 중",
};

function formatScheduleRange(start?: string, end?: string): string {
  if (!start) return "";
  const fmt = (dt: string) =>
    new Date(dt).toLocaleString("ko-KR", {
      year: "numeric", month: "numeric", day: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
  const startStr = fmt(start);
  if (!end) return startStr;
  const endDate = new Date(end);
  const endTime = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;
  return `${startStr} ~ ${endTime}`;
}

function remainingLabel(endDateTime?: string): { text: string; urgent: boolean } {
  if (!endDateTime) return { text: "", urgent: false };
  const diff = new Date(endDateTime).getTime() - Date.now();
  if (diff <= 0) return { text: "종료됨", urgent: true };
  const h = Math.floor(diff / 3600000);
  if (h < 24) return { text: `${h}시간 남음`, urgent: h < 3 };
  const d = Math.floor(h / 24);
  return { text: `D-${d}`, urgent: false };
}

interface FlagCardProps {
  flag: FlagResult;
  tab: Tab;
  onAction: () => void;
}

function FlagCard({ flag, tab, onAction }: FlagCardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { text: remText, urgent } = remainingLabel(flag.schedule?.endDateTime);
  const isClosed = flag.status === "CLOSED";
  const isDeadlinePassed = flag.schedule?.deadline
    ? new Date(flag.schedule.deadline) < new Date()
    : false;

  async function handle(action: () => Promise<{ success: boolean; message?: string }>) {
    setIsLoading(true);
    setError(null);
    const result = await action();
    setIsLoading(false);
    if (result.success) {
      onAction();
    } else {
      setError(result.message ?? "오류가 발생했습니다.");
    }
  }

  return (
    <div className="bg-white border-b border-gray-100 px-4 py-4">
      <button
        className="w-full text-left"
        onClick={() => router.push(`/flags/${flag.id}`)}
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {flag.parentFlagId && (
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">앙코르</span>
            )}
            {isClosed && (
              <span className="text-xs font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">마감됨</span>
            )}
            <p className="text-sm font-semibold text-gray-900">{flag.title ?? "제목 없음"}</p>
          </div>
          {remText && (
            <span className={`text-xs shrink-0 font-medium ${urgent ? "text-red-500" : "text-gray-400"}`}>
              {remText}
            </span>
          )}
        </div>

        {flag.description && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{flag.description}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
          <span>
            {flag.participantCount ?? 0}
            {flag.capacity ? `/${flag.capacity}명` : "명 참여 중"}
          </span>
          {flag.schedule?.startDateTime && (
            <span>{formatScheduleRange(flag.schedule.startDateTime, flag.schedule.endDateTime)}</span>
          )}
          {isDeadlinePassed && !isClosed && (
            <span className="text-orange-500 font-medium">모집 마감</span>
          )}
        </div>
      </button>

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      <div className="flex gap-2 mt-2">
        {tab === "hosting" && (
          <>
            {!isClosed && (
              <button
                disabled={isLoading}
                onClick={() => handle(() => closeRecruitmentAction(flag.id!))}
                className="text-xs px-2.5 py-1 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                모집 마감
              </button>
            )}
            <button
              disabled={isLoading}
              onClick={() => handle(() => deleteFlagAction(flag.id!))}
              className="text-xs px-2.5 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
            >
              삭제
            </button>
            <a
              href={`/flags/new?parentFlagId=${flag.id}`}
              className="text-xs px-2.5 py-1 border border-indigo-200 rounded-lg text-indigo-600 hover:bg-indigo-50"
            >
              앙코르
            </a>
          </>
        )}
        {tab === "participating" && (
          <button
            disabled={isLoading}
            onClick={() => handle(() => leaveAction(flag.id!))}
            className="text-xs px-2.5 py-1 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            참여 취소
          </button>
        )}
        {tab === "browse" && (
          <button
            disabled={isLoading || isClosed}
            onClick={() => handle(() => participateAction(flag.id!))}
            className="text-xs px-2.5 py-1 border border-indigo-300 rounded-lg text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            참여하기
          </button>
        )}
      </div>
    </div>
  );
}

interface FlagListProps {
  initialHosting: FlagResult[];
  initialParticipating: FlagResult[];
  initialBrowse: FlagResult[];
}

export default function FlagList({ initialHosting, initialParticipating, initialBrowse }: FlagListProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("browse");
  const [showClosed, setShowClosed] = useState(false);

  const tabData: Record<Tab, FlagResult[]> = {
    browse: initialBrowse,
    hosting: initialHosting,
    participating: initialParticipating,
  };

  const allFlags = tabData[activeTab];
  const flags = showClosed ? allFlags : allFlags.filter((f) => f.status !== "CLOSED");

  return (
    <div>
      {/* 탭 + 종료 포함 토글 */}
      <div className="flex items-center border-b border-gray-200 bg-white px-1">
        <div className="flex flex-1">
          {(["browse", "hosting", "participating"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "text-indigo-600 border-b-2 border-indigo-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-gray-400 px-3 shrink-0 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showClosed}
            onChange={(e) => setShowClosed(e.target.checked)}
            className="w-3.5 h-3.5 accent-indigo-600"
          />
          종료 포함
        </label>
      </div>

      {/* 목록 */}
      {flags.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-sm font-medium">Flag가 없습니다.</p>
        </div>
      ) : (
        <ul>
          {flags.map((flag) => (
            <li key={flag.id}>
              <FlagCard flag={flag} tab={activeTab} onAction={() => router.refresh()} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
