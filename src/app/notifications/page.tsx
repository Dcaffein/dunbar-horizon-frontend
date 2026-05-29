import Link from "next/link";
import { getNotificationsAction } from "@/app/actions/notification";
import NotificationList from "@/components/Notifications/NotificationList";
import { isRedirectError } from "@/api/apiClient";
import type { NotificationResponse } from "@/api/model/notificationResponse";

export default async function NotificationsPage() {
  let notifications: NotificationResponse[] = [];
  let hasMore = false;

  try {
    const result = await getNotificationsAction(0);
    if (result.success && result.data) {
      notifications = result.data.content ?? [];
      hasMore = !result.data.last;
    }
  } catch (error) {
    if (isRedirectError(error)) throw error;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link
          href="/"
          className="text-gray-500 hover:text-indigo-600 transition-colors"
          aria-label="뒤로가기"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold text-gray-900">알림</h1>
      </header>

      <main className="max-w-lg mx-auto">
        <NotificationList
          initialNotifications={notifications}
          initialHasMore={hasMore}
        />
      </main>
    </div>
  );
}
