"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { SocialProfileResult } from "@/api/model/socialProfileResult";
import { recordTraceAction } from "@/app/actions/social";
import { getConnectionPathAction } from "@/app/actions/friendship";
import { sendFriendRequestAction } from "@/app/actions/friendRequest";

interface PublicProfileProps {
  profile: SocialProfileResult;
  userId: number;
}

type RequestStatus = "idle" | "loading" | "sent" | "error";
type PathStatus = "idle" | "loading" | "done";

export default function PublicProfile({ profile, userId }: PublicProfileProps) {
  const router = useRouter();
  const [revealed, setRevealed] = useState(false);
  const [requestStatus, setRequestStatus] = useState<RequestStatus>("idle");
  const [pathStatus, setPathStatus] = useState<PathStatus>("idle");
  const [connectionLabel, setConnectionLabel] = useState<string | null>(null);

  const displayName = profile.nickname ?? "알 수 없는 사용자";
  const initial = displayName.charAt(0);

  useEffect(() => {
    recordTraceAction(userId).then((r) => {
      if (r?.data?.revealed) setRevealed(true);
    });
  }, [userId]);

  async function handleFindPath() {
    setPathStatus("loading");
    const result = await getConnectionPathAction(userId);
    if (result?.success && result.data) {
      const intermediary = result.data.intermediaries?.[0];
      if (intermediary?.nickname) {
        setConnectionLabel(`${intermediary.nickname}님을 통한 연결이 자연스러워 보입니다.`);
      } else {
        setConnectionLabel("공통 연결 고리를 찾을 수 없습니다.");
      }
    } else {
      setConnectionLabel("공통 연결 고리를 찾을 수 없습니다.");
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

      <div className="flex-1 overflow-y-auto">
        {/* 프로필 헤더 */}
        <div className="pt-6 pb-4 flex flex-col items-center px-4">
          <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
            {profile.profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.profileImageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-indigo-700 font-bold text-xl">{initial}</span>
            )}
          </div>
          <p className="mt-3 text-base font-bold text-gray-900">{displayName}</p>
          {revealed && (
            <span className="mt-2 inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
              <span>👀</span> 최근 서로 자주 방문
            </span>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="px-4 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* 친구 요청 */}
            {requestStatus === "sent" ? (
              <div className="flex flex-col items-center justify-center gap-2 py-5 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <span className="text-2xl">✓</span>
                <span className="text-xs font-semibold text-emerald-600">요청 완료</span>
              </div>
            ) : (
              <button
                onClick={handleFriendRequest}
                disabled={requestStatus === "loading"}
                className="flex flex-col items-center justify-center gap-2 py-5 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition disabled:opacity-50"
              >
                <span className="text-2xl">👋</span>
                <span className="text-xs font-semibold text-gray-700">
                  {requestStatus === "loading" ? "전송 중..." : "친구 요청"}
                </span>
              </button>
            )}

            {/* 연결 고리 찾기 */}
            {pathStatus === "idle" && (
              <button
                onClick={handleFindPath}
                className="flex flex-col items-center justify-center gap-2 py-5 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition"
              >
                <span className="text-2xl">🔗</span>
                <span className="text-xs font-semibold text-gray-700">연결 고리 찾기</span>
              </button>
            )}
            {pathStatus === "loading" && (
              <div className="flex flex-col items-center justify-center gap-2 py-5 bg-white border border-gray-200 rounded-2xl opacity-60">
                <span className="text-2xl">🔗</span>
                <span className="text-xs font-semibold text-gray-400">분석 중...</span>
              </div>
            )}
            {pathStatus === "done" && (
              <div className="flex flex-col items-center justify-center gap-2 py-5 bg-indigo-50 border border-indigo-100 rounded-2xl">
                <span className="text-2xl">🔗</span>
                <span className="text-xs font-semibold text-indigo-500">분석 완료</span>
              </div>
            )}
          </div>

          {requestStatus === "error" && (
            <p className="text-xs text-red-500 text-center">친구 요청에 실패했습니다.</p>
          )}

          {/* 연결 경로 결과 */}
          {pathStatus === "done" && connectionLabel && (
            <div className="px-4 py-4 bg-white border border-gray-200 rounded-2xl">
              <p className="text-xs font-bold text-gray-400 mb-1.5">연결 경로</p>
              <p className="text-sm text-gray-700">{connectionLabel}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
