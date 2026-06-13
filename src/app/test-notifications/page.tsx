import NotificationList from "@/components/Notifications/NotificationList";
import type { NotificationResponse } from "@/api/model/notificationResponse";
import { NotificationResponseType } from "@/api/model/notificationResponseType";
import Link from "next/link";

const MOCK_NOTIFICATIONS: NotificationResponse[] = [
  {
    id: "1",
    type: NotificationResponseType.FLAG_INVITATION,
    title: "수환님이 Flag에 초대했습니다",
    content: "한강 치맥 파티 🍗 · 6. 21. 17:00",
    metadata: { invitationId: 101, flagId: 1 } as unknown as NotificationResponse["metadata"],
    isRead: false,
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: "2",
    type: NotificationResponseType.FLAG_ENCORE,
    title: "앙코르 Flag가 생성됐어요",
    content: "클라이밍 모임 시즌 2 · 7. 5. 10:00",
    metadata: { flagId: 3 } as unknown as NotificationResponse["metadata"],
    isRead: false,
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
  },
  {
    id: "3",
    type: NotificationResponseType.FRIEND_REQUEST_ACCEPT,
    title: "지민님이 친구 요청을 수락했습니다",
    content: undefined,
    metadata: {} as unknown as NotificationResponse["metadata"],
    isRead: true,
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: "4",
    type: NotificationResponseType.NOTICE,
    title: "서비스 점검 안내",
    content: "6월 15일 새벽 2시~4시 서버 점검이 예정되어 있습니다.",
    metadata: {} as unknown as NotificationResponse["metadata"],
    isRead: true,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

export default function TestNotificationsPage() {
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
        <NotificationList
          initialNotifications={MOCK_NOTIFICATIONS}
          initialHasMore={false}
        />
      </main>
    </div>
  );
}
