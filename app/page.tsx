import LogoutButton from "@/components/LogoutButton";
import SocialGraph from "@/components/SocialGraph";
import { springClient } from "@/lib/springClient";
import type { OneHopsNetworkDto } from "@/components/SocialGraph"; // DTO 타입 재사용

export default async function MainPage() {
  const friends = await springClient.get<OneHopsNetworkDto[]>(
    "/api/v1/social/network"
  );

  return (
    <main className="h-screen bg-gray-50 flex flex-col p-6 overflow-hidden">
      <header className="flex justify-between items-center mb-4 px-2">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            GooRoom Network
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            총 <span className="font-bold text-gray-700">{friends.length}</span>
            명의 친구
          </p>
        </div>
        <LogoutButton />
      </header>

      <section className="flex-1 w-full bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden relative">
        {friends.length === 0 ? (
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
            <p className="text-xl font-medium">연결된 친구가 없습니다.</p>
            <p className="mt-2 text-sm">
              친구를 추가하여 네트워크를 형성해보세요.
            </p>
          </div>
        ) : (
          <SocialGraph friends={friends} />
        )}
      </section>
    </main>
  );
}
