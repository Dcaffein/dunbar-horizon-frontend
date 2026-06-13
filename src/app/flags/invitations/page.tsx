import Link from "next/link";
import { isRedirectError } from "@/api/apiClient";
import { getNotificationsAction } from "@/app/actions/notification";
import { NotificationResponseType } from "@/api/model/notificationResponseType";
import FlagInvitationList from "@/components/Flag/FlagInvitationList";
import type { NotificationResponse } from "@/api/model/notificationResponse";

export default async function FlagInvitationsPage() {
  let invitations: NotificationResponse[] = [];

  try {
    const result = await getNotificationsAction(0, 100);
    if (result.success && result.data) {
      invitations = (result.data.content ?? []).filter(
        (n) => n.type === NotificationResponseType.FLAG_INVITATION,
      );
    }
  } catch (error) {
    if (isRedirectError(error)) throw error;
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
        <FlagInvitationList initialInvitations={invitations} />
      </div>
    </div>
  );
}
