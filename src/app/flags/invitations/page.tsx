import Link from "next/link";
import { isRedirectError } from "@/api/apiClient";
import { getReceivedInvitationsAction, getSentInvitationsAction } from "@/app/actions/flag";
import FlagInvitationTabs from "@/components/Flag/FlagInvitationTabs";
import type { ReceivedFlagInvitationResult } from "@/api/model/receivedFlagInvitationResult";
import type { SentFlagInvitationResult } from "@/api/model/sentFlagInvitationResult";

export default async function FlagInvitationsPage() {
  let received: ReceivedFlagInvitationResult[] = [];
  let sent: SentFlagInvitationResult[] = [];

  try {
    const [r, s] = await Promise.all([
      getReceivedInvitationsAction(),
      getSentInvitationsAction(),
    ]);
    received = r.data;
    sent = s.data;
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
        <h1 className="text-base font-bold text-gray-900">Flag 초대</h1>
      </header>
      <div className="flex-1 max-w-lg mx-auto w-full">
        <FlagInvitationTabs initialReceived={received} initialSent={sent} />
      </div>
    </div>
  );
}
