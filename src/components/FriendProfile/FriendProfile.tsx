"use client";

import { useRouter } from "next/navigation";
import type { FriendshipDetailResult } from "@/api/model/friendshipDetailResult";
import type { ConnectionPathResult } from "@/api/model/connectionPathResult";

interface FriendProfileProps {
  profile: FriendshipDetailResult;
  path: ConnectionPathResult | null;
  revealed?: boolean;
}

export default function FriendProfile({ profile, path, revealed = false }: FriendProfileProps) {
  const router = useRouter();

  const displayName = profile.friendAlias || profile.friendNickname;
  const initial = displayName?.charAt(0) ?? "?";

  function connectionLabel(): string | null {
    if (!path) return null;
    if (path.direct) return "직접 연결된 친구입니다.";
    const intermediary = path.intermediaries?.[0];
    if (intermediary?.nickname) {
      return `${intermediary.nickname}을(를) 통해 연결됩니다.`;
    }
    return null;
  }

  const label = connectionLabel();

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

      <div className="flex-1 overflow-y-auto">
        {/* 프로필 */}
        <div className="bg-white px-6 py-8 flex flex-col items-center border-b">
          <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden mb-4 shrink-0">
            {profile.friendProfileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.friendProfileImageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-indigo-700 font-bold text-2xl">{initial}</span>
            )}
          </div>

          {profile.friendAlias && (
            <p className="text-lg font-bold text-gray-900">{profile.friendAlias}</p>
          )}
          <p className={`text-sm ${profile.friendAlias ? "text-gray-500 mt-0.5" : "text-lg font-bold text-gray-900"}`}>
            {profile.friendNickname}
          </p>

          {revealed && (
            <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
              <span className="text-base">👀</span>
              <span className="text-xs text-amber-700 font-medium">최근 서로 자주 방문했습니다</span>
            </div>
          )}
        </div>

        {/* 연결 경로 */}
        {label && (
          <div className="bg-white px-4 py-4 border-b mt-2">
            <p className="text-xs font-bold text-gray-500 mb-2">연결 경로</p>
            <p className="text-sm text-gray-700">{label}</p>
          </div>
        )}
      </div>
    </div>
  );
}
