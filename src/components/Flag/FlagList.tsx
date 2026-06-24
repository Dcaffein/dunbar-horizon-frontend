"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { FlagResult } from "@/api/model/flagResult";
import { getFriendFlagsAction } from "@/app/actions/flag";

type Tab = "participating" | "hosting" | "browse";
type StatusFilter = "active" | "deadline" | "ended";

const TAB_LABELS: Record<Tab, string> = {
  participating: "참여 중",
  hosting: "호스팅",
  browse: "둘러보기",
};

const FILTER_LABELS: Record<StatusFilter, string> = {
  active: "모집중",
  deadline: "모집마감",
  ended: "종료됨",
};

function flagStatus(flag: FlagResult): StatusFilter {
  if (flag.status === "ENDED") return "ended";
  if (flag.status === "WAITING") return "deadline";
  return "active"; // RECRUITING
}

function formatScheduleRange(start?: string, end?: string): string {
  if (!start) return "";
  const fmt = (dt: string) => {
    const d = new Date(dt);
    return `${d.getMonth() + 1}. ${d.getDate()}. ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  if (!end) return fmt(start);
  const s = new Date(start);
  const e = new Date(end);
  const endStr = s.toDateString() === e.toDateString()
    ? `${String(e.getHours()).padStart(2, "0")}:${String(e.getMinutes()).padStart(2, "0")}`
    : fmt(end);
  return `${fmt(start)} ~ ${endStr}`;
}

function remainingLabel(target?: string): { text: string; urgent: boolean } {
  if (!target) return { text: "", urgent: false };
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return { text: "종료됨", urgent: false };
  const totalMins = Math.floor(diff / 60000);
  if (totalMins < 60) return { text: `${totalMins}분 남음`, urgent: true };
  const h = Math.floor(diff / 3600000);
  if (h < 3) return { text: `${h}시간 남음`, urgent: true };
  const dt = new Date(target);
  const hhmm = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dt.toDateString() === today.toDateString()) return { text: `오늘 ${hhmm}`, urgent: false };
  if (dt.toDateString() === tomorrow.toDateString()) return { text: `내일 ${hhmm}`, urgent: false };
  return { text: `D-${Math.floor(h / 24)}`, urgent: false };
}

const STATUS_PILL: Record<StatusFilter, string> = {
  active: "bg-emerald-50 text-emerald-600",
  deadline: "bg-amber-50 text-amber-600",
  ended: "bg-gray-100 text-gray-400",
};

interface FlagCardProps {
  flag: FlagResult;
}

function FlagCard({ flag }: FlagCardProps) {
  const router = useRouter();

  const status = flagStatus(flag);
  const countdownTarget =
    status === "active" && flag.schedule?.deadline
      ? flag.schedule.deadline
      : flag.schedule?.endDateTime;
  const { text: remText, urgent } = remainingLabel(countdownTarget);

  return (
    <div className="mx-4 my-3 rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.07)] overflow-hidden">
      <button
        className="w-full text-left px-4 pt-4 pb-3"
        onClick={() => router.push(`/flags/${flag.id}`)}
      >
        {/* 상단: 배지 + 남은시간 */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            {flag.parentFlagId && (
              <span className="text-xs font-semibold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">앙코르</span>
            )}
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_PILL[status]}`}>
              {FILTER_LABELS[status]}
            </span>
          </div>
          {remText && status !== "ended" && (
            <span className={`text-xs font-medium ${urgent ? "text-red-400" : "text-gray-400"}`}>
              {remText}
            </span>
          )}
        </div>

        {/* 제목 */}
        <p className="text-base font-bold text-gray-900 leading-snug mb-1">
          {flag.title ?? "제목 없음"}
        </p>

        {/* description */}
        {flag.description && (
          <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-2">
            {flag.description}
          </p>
        )}

        {/* 메타 */}
        <p className="text-xs text-gray-400">
          {flag.participantCount ?? 0}{flag.capacity ? `/${flag.capacity}명` : "명 참여"}
          {flag.schedule?.startDateTime && (
            <> · {formatScheduleRange(flag.schedule.startDateTime, flag.schedule.endDateTime)}</>
          )}
        </p>
      </button>

    </div>
  );
}

interface FlagListProps {
  initialHosting: FlagResult[];
  initialParticipating: FlagResult[];
}

export default function FlagList({ initialHosting, initialParticipating }: FlagListProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("participating");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [browseFlags, setBrowseFlags] = useState<FlagResult[]>([]);
  const [browseFetched, setBrowseFetched] = useState(false);

  useEffect(() => {
    getFriendFlagsAction().then((result) => {
      if (result.success) setBrowseFlags(result.data);
      setBrowseFetched(true);
    });
  }, []);

  const tabData: Record<Tab, FlagResult[]> = {
    participating: initialParticipating,
    hosting: initialHosting,
    browse: browseFlags,
  };

  const flags = tabData[activeTab].filter((f) => flagStatus(f) === statusFilter);

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    setStatusFilter("active");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 탭 바 */}
      <div className="flex border-b border-gray-200 bg-white">
        {(["participating", "hosting", "browse"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* 필터 세그먼트 */}
      <div className="flex gap-2 px-4 py-3 bg-white border-b border-gray-100">
        {(["active", "deadline", "ended"] as StatusFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              statusFilter === f
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
            }`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {/* 종료됨 보존 안내 */}
      {statusFilter === "ended" && activeTab !== "browse" && (
        <p className="text-xs text-gray-400 px-4 py-2 bg-white border-b border-gray-50">
          앙코르 또는 메모리얼을 남기면 Flag가 보존됩니다.
        </p>
      )}

      {/* 목록 */}
      {activeTab === "browse" && !browseFetched ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <svg className="w-8 h-8 mb-3 animate-spin text-indigo-300" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <p className="text-sm text-gray-400">친구들의 Flag를 불러오는 중...</p>
        </div>
      ) : flags.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <svg className="w-12 h-12 mb-3 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-sm font-medium text-gray-400">
            {FILTER_LABELS[statusFilter]} Flag가 없습니다.
          </p>
        </div>
      ) : (
        <ul className="py-2">
          {flags.map((flag) => (
            <li key={flag.id}>
              <FlagCard flag={flag} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
