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
type StatusFilter = "active" | "deadline" | "ended";

const TAB_LABELS: Record<Tab, string> = {
  browse: "둘러보기",
  hosting: "호스팅",
  participating: "참여 중",
};

const FILTER_LABELS: Record<StatusFilter, string> = {
  active: "모집중",
  deadline: "모집마감",
  ended: "종료됨",
};

function flagStatus(flag: FlagResult): StatusFilter {
  const now = Date.now();
  if (flag.schedule?.endDateTime && new Date(flag.schedule.endDateTime).getTime() < now) return "ended";
  if (flag.status === "CLOSED") return "deadline";
  return "active";
}

function formatScheduleRange(start?: string, end?: string): string {
  if (!start) return "";
  const fmt = (dt: string) => {
    const d = new Date(dt);
    return `${d.getMonth() + 1}. ${d.getDate()}. ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  if (!end) return fmt(start);
  const endDate = new Date(end);
  return `${fmt(start)} ~ ${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;
}

function remainingLabel(endDateTime?: string): { text: string; urgent: boolean } {
  if (!endDateTime) return { text: "", urgent: false };
  const diff = new Date(endDateTime).getTime() - Date.now();
  if (diff <= 0) return { text: "종료됨", urgent: false };
  const h = Math.floor(diff / 3600000);
  if (h < 24) return { text: `${h}시간 남음`, urgent: h < 3 };
  const d = Math.floor(h / 24);
  return { text: `D-${d}`, urgent: false };
}

const STATUS_PILL: Record<StatusFilter, string> = {
  active: "bg-emerald-50 text-emerald-600",
  deadline: "bg-amber-50 text-amber-600",
  ended: "bg-gray-100 text-gray-400",
};

interface FlagCardProps {
  flag: FlagResult;
  tab: Tab;
  onAction: () => void;
}

function FlagCard({ flag, tab, onAction }: FlagCardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = flagStatus(flag);
  const { text: remText, urgent } = remainingLabel(flag.schedule?.endDateTime);

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

      {error && <p className="text-xs text-red-500 px-4 pb-1">{error}</p>}

      {/* 액션 버튼 */}
      {(tab === "hosting" || tab === "participating" || tab === "browse") && (
        <div className="flex gap-2 px-4 pb-3 pt-1 border-t border-gray-50">
          {tab === "hosting" && (
            <>
              {status === "active" && (
                <button
                  disabled={isLoading}
                  onClick={() => handle(() => closeRecruitmentAction(flag.id!))}
                  className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  모집 마감
                </button>
              )}
              <button
                disabled={isLoading}
                onClick={() => handle(() => deleteFlagAction(flag.id!))}
                className="text-xs px-3 py-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                삭제
              </button>
            </>
          )}
          {tab === "participating" && (
            <button
              disabled={isLoading}
              onClick={() => handle(() => leaveAction(flag.id!))}
              className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              참여 취소
            </button>
          )}
          {tab === "browse" && status === "active" && (
            <button
              disabled={isLoading}
              onClick={() => handle(() => participateAction(flag.id!))}
              className="text-xs px-3 py-1.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              참여하기
            </button>
          )}
        </div>
      )}
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");

  const tabData: Record<Tab, FlagResult[]> = {
    browse: initialBrowse,
    hosting: initialHosting,
    participating: initialParticipating,
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
        {(["browse", "hosting", "participating"] as Tab[]).map((tab) => (
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

      {/* 목록 */}
      {flags.length === 0 ? (
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
              <FlagCard flag={flag} tab={activeTab} onAction={() => router.refresh()} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
