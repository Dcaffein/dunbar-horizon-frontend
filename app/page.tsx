// app/page.tsx
import LogoutButton from "@/components/LogoutButton";
import SocialGraph from "@/components/socialGraph";
import { springClient } from "@/lib/springClient";
import type { FriendshipDetail } from "@/components/socialGraph/types";
import { isRedirectError } from "@/lib/springClient";

export default async function MainPage() {
  let friends: FriendshipDetail[] = [];
  try {
    friends = await springClient.get<FriendshipDetail[]>("/api/v1/friends");
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    console.error("친구 목록을 불러오는 데 실패했습니다.", error);
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
            명의 친구가 지평선에 있습니다
          </p>
        </div>
        <LogoutButton />
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
              새로운 친구를 추가하여 당신만의 네트워크 지평선을 형성해보세요.
            </p>
          </div>
        ) : (
          // 친구 데이터가 있으면 클라이언트 컴포넌트로 넘겨줌.
          <SocialGraph friends={friends} />
        )}
      </section>
    </main>
  );
}
