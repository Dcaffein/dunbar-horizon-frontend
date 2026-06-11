// app/page.tsx
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import SocialGraph from "@/components/socialGraph";
import NotificationBell from "@/components/Notifications/NotificationBell";
import { apiClient } from "@/api/apiClient";
import { getUnreadCountAction } from "@/app/actions/notification";
import { getUnreadSendersAction } from "@/app/actions/buzz";
import type { FriendshipDetail } from "@/components/socialGraph/types";
import { isRedirectError } from "@/api/apiClient";

export default async function MainPage() {
  let friends: FriendshipDetail[] = [];
  let unreadCount = 0;
  let unreadBuzzSenderIds: number[] = [];

  try {
    friends = await apiClient.get<FriendshipDetail[]>("/api/v1/friends");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("친구 목록을 불러오는 데 실패했습니다.", error);
  }

  try {
    const [unreadResult, buzzSendersResult] = await Promise.all([
      getUnreadCountAction(),
      getUnreadSendersAction(),
    ]);
    if (unreadResult.success) unreadCount = unreadResult.data;
    if (buzzSendersResult.success) unreadBuzzSenderIds = buzzSendersResult.data;
  } catch {
    // 무시
  }

  return (
    <main className="h-screen bg-gray-50 flex flex-col p-6 overflow-hidden">
      {/* 상단 헤더: 로고 및 정보 */}
      <header className="flex justify-between items-center mb-4 px-2 shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Dunbar Horizon
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            총{" "}
            <span className="font-bold text-indigo-600">{friends.length}</span>
            명의 친구가 있습니다
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/requests"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-indigo-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" x2="19" y1="8" y2="14" />
              <line x1="22" x2="16" y1="11" y2="11" />
            </svg>
            친구 요청
          </Link>
          <Link
            href="/flags"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-indigo-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" x2="4" y1="22" y2="15" />
            </svg>
            Flag
          </Link>
          <Link
            href="/buzzes"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-orange-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 11 19-9-9 19-2-8-8-2z" />
            </svg>
            Buzz
          </Link>
          <NotificationBell initialUnreadCount={unreadCount} />
          <Link
            href="/profile"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-indigo-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M20 21a8 8 0 1 0-16 0" />
            </svg>
            내 프로필
          </Link>
          <LogoutButton />
        </div>
      </header>

      {/* 메인 컨텐츠 영역: 소셜 그래프 컨테이너 */}
      <section className="flex-1 w-full bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden relative">
        {friends.length === 0 ? (
          // 친구가 한 명도 없을 때 보여줄 빈 화면 (Empty State)
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <svg
              className="w-20 h-20 mb-4 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p className="text-xl font-medium text-gray-600">
              아직 연결된 친구가 없습니다.
            </p>
            <p className="mt-2 text-sm">
              새로운 친구를 추가하여 보고싶은 네트워크를 형성해보세요.
            </p>
          </div>
        ) : (
          // 친구 데이터가 있으면 클라이언트 컴포넌트로 넘겨줌.
          <SocialGraph friends={friends} unreadBuzzSenderIds={unreadBuzzSenderIds} />
        )}
      </section>
    </main>
  );
}
