"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { SocialProfileResult } from "@/api/model/socialProfileResult";
import type { FlagResult } from "@/api/model/flagResult";
import type { IntermediaryResult } from "@/api/model/intermediaryResult";
import { recordTraceAction } from "@/app/actions/social";
import { getConnectionPathAction } from "@/app/actions/friendship";
import { sendFriendRequestAction } from "@/app/actions/friendRequest";
import { getUserRecentFlagsAction } from "@/app/actions/flag";

interface PublicProfileProps {
  profile: SocialProfileResult;
  userId: number;
}

type RequestStatus = "idle" | "loading" | "sent" | "error";
type PathStatus = "idle" | "loading" | "done";

export default function PublicProfile({ profile, userId }: PublicProfileProps) {
  const router = useRouter();
  const [revealed, setRevealed] = useState(false);
  const [revealDismissed, setRevealDismissed] = useState(false);
  const [requestStatus, setRequestStatus] = useState<RequestStatus>("idle");
  const [pathStatus, setPathStatus] = useState<PathStatus>("idle");
  const [connectionIntermediary, setConnectionIntermediary] = useState<IntermediaryResult | null | undefined>(undefined);
  const [recentFlags, setRecentFlags] = useState<FlagResult[] | null>(null);
  const traceCalled = useRef(false);

  const displayName = profile.nickname ?? "알 수 없는 사용자";
  const initial = displayName.charAt(0);

  useEffect(() => {
    if (traceCalled.current) return;
    traceCalled.current = true;

    recordTraceAction(userId).then((r) => {
      if (r?.data?.revealed) setRevealed(true);
    });
    getUserRecentFlagsAction(userId).then((r) => {
      setRecentFlags(r.data ?? []);
    });
  }, [userId]);

  async function handleFindPath() {
    setPathStatus("loading");
    const result = await getConnectionPathAction(userId);
    if (result?.success && result.data) {
      const intermediary = result.data.intermediaries?.[0];
      setConnectionIntermediary(intermediary ?? null);
    } else {
      setConnectionIntermediary(null);
    }
    setPathStatus("done");
  }

  async function handleFriendRequest() {
    setRequestStatus("loading");
    const result = await sendFriendRequestAction(userId);
    if (result.success) {
      setRequestStatus("sent");
    } else {
      setRequestStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3 shrink-0">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-base font-bold text-gray-900">프로필</h1>
      </header>

      <div className="flex-1 overflow-y-auto pb-8">
        <div className="flex gap-3 px-4 mt-5 items-start">

          {/* 좌측 (1/4) — 명함 */}
          <div className="w-1/4 shrink-0 flex flex-col gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
                {profile.profileImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.profileImageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-indigo-700 font-bold text-sm">{initial}</span>
                )}
              </div>
              <p className="text-xs font-bold text-gray-900 break-all leading-tight">{displayName}</p>
            </div>

          </div>

          {/* 우측 (3/4) — 액션 섹션 */}
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            {/* 친구 요청 */}
            {requestStatus === "sent" ? (
              <div className="w-full text-sm py-2.5 px-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 font-medium text-emerald-600">
                <span>✓</span> 요청 완료
              </div>
            ) : (
              <button
                onClick={handleFriendRequest}
                disabled={requestStatus === "loading"}
                className="w-full text-sm py-2.5 px-4 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition font-medium flex items-center justify-between disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  <span>👋</span>
                  {requestStatus === "loading" ? "전송 중..." : "친구 요청"}
                </span>
                <span className="text-gray-500 text-base">›</span>
              </button>
            )}
            {requestStatus === "error" && (
              <p className="text-xs text-red-500 px-1">친구 요청에 실패했습니다.</p>
            )}

            {/* 최근 Flag */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {recentFlags === null && (
                <p className="text-xs text-gray-400 px-3 py-3">불러오는 중...</p>
              )}
              {recentFlags?.length === 0 && (
                <p className="text-xs text-gray-400 px-3 py-3">참여한 Flag가 없습니다.</p>
              )}
              {recentFlags?.map((flag, idx) => (
                <Link
                  key={flag.id}
                  href={`/flags/${flag.id}`}
                  className={`flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 active:bg-gray-100 transition ${idx !== 0 ? "border-t border-gray-100" : ""}`}
                >
                  <span className="text-xs text-indigo-400 shrink-0">🚩</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-800 truncate">{flag.title}</p>
                    {flag.host?.nickname && (
                      <p className="text-xs text-gray-400 truncate">{flag.host.nickname}</p>
                    )}
                  </div>
                  <span className="text-gray-500 text-base shrink-0">›</span>
                </Link>
              ))}
            </div>

            {/* 연결 고리 찾기 */}
            <button
              onClick={handleFindPath}
              disabled={pathStatus !== "idle"}
              className="w-full text-sm py-2.5 px-4 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition font-medium flex items-center justify-between disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                <span>🔗</span>
                {pathStatus === "loading" ? "분석 중..." : "연결 고리 찾기"}
              </span>
            </button>

            {pathStatus === "done" && (
              connectionIntermediary ? (
                <Link
                  href={`/users/${connectionIntermediary.userId}`}
                  className="bg-white border border-indigo-100 rounded-xl p-3 flex items-center gap-3 hover:bg-indigo-50 transition"
                >
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-indigo-700">
                      {connectionIntermediary.nickname?.charAt(0) ?? "?"}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{connectionIntermediary.nickname}</p>
                    <p className="text-xs text-gray-500">님을 통한 연결이 자연스러워 보입니다.</p>
                  </div>
                  <span className="text-gray-500 text-base shrink-0">›</span>
                </Link>
              ) : (
                <p className="px-1 text-xs text-gray-400">공통 연결 고리를 찾을 수 없습니다.</p>
              )
            )}
          </div>
        </div>
      </div>

      {/* Reveal 팝업 */}
      {revealed && !revealDismissed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 pt-8 pb-6 flex flex-col items-center text-center">
              <p className="text-xs font-medium text-indigo-500 mb-4">최근 서로 간 방문이 잦았어요</p>
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden mb-3">
                {profile.profileImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.profileImageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-indigo-700">{initial}</span>
                )}
              </div>
              <p className="text-base font-bold text-gray-900">{displayName}</p>
            </div>
            <div className="px-6 py-4">
              <button
                onClick={() => setRevealDismissed(true)}
                className="w-full bg-indigo-600 text-white text-sm font-semibold py-3 rounded-xl hover:bg-indigo-700 transition"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
