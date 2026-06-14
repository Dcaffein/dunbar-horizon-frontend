"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { FriendshipDetailResult } from "@/api/model/friendshipDetailResult";
import type { FlagResult } from "@/api/model/flagResult";
import type { LabelResult } from "@/api/model/labelResult";
import type { IntermediaryResult } from "@/api/model/intermediaryResult";
import { recordTraceAction } from "@/app/actions/social";
import { getConnectionPathAction, updateFriendAction, deleteFriendAction } from "@/app/actions/friendship";
import { getUserRecentFlagsAction } from "@/app/actions/flag";

interface FriendProfileProps {
  profile: FriendshipDetailResult;
  userId: number;
  myLabels: LabelResult[];
}

type PathStatus = "idle" | "loading" | "done";

export default function FriendProfile({ profile, userId, myLabels }: FriendProfileProps) {
  const router = useRouter();
  const [revealed, setRevealed] = useState(false);
  const [pathStatus, setPathStatus] = useState<PathStatus>("idle");
  const [connectionIntermediary, setConnectionIntermediary] = useState<IntermediaryResult | null | undefined>(undefined);

  const [aliasInput, setAliasInput] = useState(profile.friendAlias ?? "");
  const [isMuted, setIsMuted] = useState(profile.isMuted ?? false);
  const [isRoutable, setIsRoutable] = useState(profile.isRoutable ?? true);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [recentFlags, setRecentFlags] = useState<FlagResult[] | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<LabelResult | null>(null);

  const initial = (profile.friendAlias || profile.friendNickname)?.charAt(0) ?? "?";

  useEffect(() => {
    recordTraceAction(userId).then((r) => {
      if (r?.data?.revealed) setRevealed(true);
    });
    getUserRecentFlagsAction(userId).then((r) => {
      setRecentFlags(r.data);
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

  async function handleSaveAlias() {
    setSettingsLoading(true);
    setSettingsError(null);
    const result = await updateFriendAction(userId, { friendAlias: aliasInput });
    setSettingsLoading(false);
    if (!result.success) setSettingsError(result.message ?? "저장에 실패했습니다.");
  }

  async function handleMuteToggle() {
    setSettingsLoading(true);
    setSettingsError(null);
    const newValue = !isMuted;
    const result = await updateFriendAction(userId, { isMuted: newValue });
    setSettingsLoading(false);
    if (result.success) {
      setIsMuted(newValue);
    } else {
      setSettingsError(result.message ?? "설정 변경에 실패했습니다.");
    }
  }

  async function handleRoutableToggle() {
    setSettingsLoading(true);
    setSettingsError(null);
    const newValue = !isRoutable;
    const result = await updateFriendAction(userId, { isRoutable: newValue });
    setSettingsLoading(false);
    if (result.success) {
      setIsRoutable(newValue);
    } else {
      setSettingsError(result.message ?? "설정 변경에 실패했습니다.");
    }
  }

  async function handleDelete() {
    setSettingsLoading(true);
    const result = await deleteFriendAction(userId);
    if (result.success) {
      router.push("/");
    } else {
      setSettingsLoading(false);
      setSettingsError(result.message ?? "삭제에 실패했습니다.");
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
        <h1 className="text-base font-bold text-gray-900">친구 프로필</h1>
      </header>

      <div className="flex-1 overflow-y-auto pb-8">
        <div className="flex gap-3 px-4 mt-5 items-start">

          {/* 좌측 (1/4) — 명함 + 디테일 */}
          <div className="w-1/4 shrink-0 flex flex-col gap-3">

            {/* 명함 섹션 */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
                {profile.friendProfileImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.friendProfileImageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-indigo-700 font-bold text-sm">{initial}</span>
                )}
              </div>
              <div className="w-full">
                {profile.friendAlias ? (
                  <>
                    <p className="text-xs font-bold text-gray-900 break-all leading-tight">{profile.friendAlias}</p>
                    <p className="text-xs text-gray-400 break-all leading-tight mt-0.5">{profile.friendNickname}</p>
                  </>
                ) : (
                  <p className="text-xs font-bold text-gray-900 break-all leading-tight">{profile.friendNickname}</p>
                )}
                {revealed && <p className="text-xs text-amber-600 mt-1">👀</p>}
              </div>
            </div>

            {/* 디테일 섹션 */}
            <div className="flex flex-col gap-2.5">
              {/* 라벨 */}
              {myLabels.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {myLabels.map((label) => (
                    <button
                      key={label.id}
                      onClick={() => setSelectedLabel(label)}
                      className="text-xs px-1.5 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full font-medium hover:bg-indigo-100 transition"
                    >
                      {label.labelName}
                    </button>
                  ))}
                </div>
              )}

              {/* 별명 — 입력 + 저장 위아래 */}
              <div className="space-y-1">
                <input
                  type="text"
                  value={aliasInput}
                  onChange={(e) => setAliasInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveAlias()}
                  placeholder="별명"
                  disabled={settingsLoading}
                  className="w-full text-xs text-gray-900 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-400 disabled:opacity-50"
                />
                <button
                  onClick={handleSaveAlias}
                  disabled={settingsLoading}
                  className="w-full text-xs py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  저장
                </button>
              </div>

              {/* 토글 2개 나란히 */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                {/* 음소거 */}
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] text-gray-600 truncate">음소거</span>
                  <button
                    onClick={handleMuteToggle}
                    disabled={settingsLoading}
                    className={`relative w-8 h-4 rounded-full transition-colors disabled:opacity-50 shrink-0 ${isMuted ? "bg-amber-400" : "bg-gray-200"}`}
                  >
                    <span className={`absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${isMuted ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>
                {/* 경유 */}
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] text-gray-600 truncate">경유</span>
                  <button
                    onClick={handleRoutableToggle}
                    disabled={settingsLoading}
                    className={`relative w-8 h-4 rounded-full transition-colors disabled:opacity-50 shrink-0 ${isRoutable ? "bg-indigo-500" : "bg-gray-200"}`}
                  >
                    <span className={`absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${isRoutable ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>
              </div>

              {settingsError && (
                <p className="text-xs text-red-500 text-center">{settingsError}</p>
              )}

              {/* 친구 삭제 */}
              <button
                onClick={handleDelete}
                disabled={settingsLoading}
                className="w-full text-xs py-1.5 text-red-500 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition"
              >
                친구 삭제
              </button>
            </div>
          </div>

          {/* 우측 (3/4) — 액션 섹션 */}
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            {/* Buzz 보내기 */}
            <button
              onClick={() => router.push(`/buzzes/new?to=${userId}`)}
              className="w-full text-sm py-2.5 px-4 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition font-medium flex items-center justify-between"
            >
              <span className="flex items-center gap-2"><span>📢</span> Buzz 보내기</span>
              <span className="text-gray-500 text-base">›</span>
            </button>

            {/* 최근 Flag 섹션 */}
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

            {/* 연결 고리 결과 — 명함 카드 */}
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

      {/* 라벨 바텀시트 */}
      {selectedLabel && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/30"
          onClick={() => setSelectedLabel(null)}
        >
          <div
            className="w-full bg-white rounded-t-2xl shadow-xl px-4 pt-3 pb-10 flex flex-col max-h-[70vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3" />
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h2 className="text-sm font-bold text-gray-900">{selectedLabel.labelName}</h2>
              <button
                onClick={() => setSelectedLabel(null)}
                className="text-gray-400 hover:text-gray-600 p-1 -mr-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col overflow-y-auto">
              {selectedLabel.members?.map((member) => (
                <button
                  key={member.id}
                  onClick={() => {
                    setSelectedLabel(null);
                    router.push(`/users/${member.id}`);
                  }}
                  className="flex items-center gap-2.5 py-2.5 px-1 rounded-lg hover:bg-gray-50 active:bg-gray-100 text-left transition"
                >
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-indigo-700">{member.nickname?.charAt(0)}</span>
                  </div>
                  <span className="text-sm text-gray-800">{member.nickname}</span>
                </button>
              ))}
              {(!selectedLabel.members || selectedLabel.members.length === 0) && (
                <p className="text-xs text-gray-400 py-2">멤버가 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
