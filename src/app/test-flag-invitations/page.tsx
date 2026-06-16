import FlagInvitationList from "@/components/Flag/FlagInvitationList";
import NotificationList from "@/components/Notifications/NotificationList";
import type { NotificationResponse } from "@/api/model/notificationResponse";
import type { ReceivedFlagInvitationResult } from "@/api/model/receivedFlagInvitationResult";
import { NotificationResponseType } from "@/api/model/notificationResponseType";
import Link from "next/link";

const MOCK_INVITATIONS: ReceivedFlagInvitationResult[] = [
  {
    id: 1,
    flagId: 1,
    flagTitle: "한강 치맥 파티 🍗",
    flagDescription: "6. 21. 17:00",
    inviterNickname: "수환",
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: 2,
    flagId: 4,
    flagTitle: "북한산 트레킹 🏔️",
    flagDescription: "6. 28. 07:00",
    inviterNickname: "지민",
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 3,
    flagId: 5,
    flagTitle: "홍대 보드게임 카페 🎲",
    flagDescription: "7. 5. 14:00",
    inviterNickname: "현우",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const MOCK_NOTIFICATIONS: NotificationResponse[] = [
  {
    id: "n1",
    type: NotificationResponseType.FLAG_INVITATION,
    title: "수환님이 Flag에 초대했습니다",
    content: "한강 치맥 파티 🍗 · 6. 21. 17:00",
    metadata: {} as unknown as NotificationResponse["metadata"],
    isRead: false,
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: "n2",
    type: NotificationResponseType.FLAG_ENCORE,
    title: "앙코르 Flag가 생성됐어요",
    content: "클라이밍 모임 시즌 2 · 7. 5. 10:00",
    metadata: {} as unknown as NotificationResponse["metadata"],
    isRead: false,
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
  },
  {
    id: "n3",
    type: NotificationResponseType.FRIEND_REQUEST_ACCEPT,
    title: "지민님이 친구 요청을 수락했습니다",
    content: undefined,
    metadata: {} as unknown as NotificationResponse["metadata"],
    isRead: true,
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
];

export default function TestFlagInvitationsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  return <Resolved searchParams={searchParams} />;
}

async function Resolved({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;

  if (view === "notifications") {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
          <Link href="/" className="text-gray-500 hover:text-indigo-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">알림</h1>
        </header>
        <main className="max-w-lg mx-auto">
          <NotificationList initialNotifications={MOCK_NOTIFICATIONS} initialHasMore={false} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 shrink-0">
        <Link href="/flags" className="text-gray-400 hover:text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="text-base font-bold text-gray-900">받은 초대</h1>
      </header>
      <div className="flex-1 max-w-lg mx-auto w-full">
        <FlagInvitationList initialInvitations={MOCK_INVITATIONS} />
      </div>
    </div>
  );
}
