import Link from "next/link";
import { isRedirectError, toFailure } from "@/api/apiClient";
import type { Failure } from "@/api/apiClient";
import { getReceivedInvitationsAction, getSentInvitationsAction } from "@/app/actions/flag";
import FlagInvitationTabs from "@/components/Flag/FlagInvitationTabs";
import type { FlagInvitationResult } from "@/api/model/flagInvitationResult";

export default async function FlagInvitationsPage() {
  let received: FlagInvitationResult[] = [];
  let sent: FlagInvitationResult[] = [];

  // 탭마다 데이터가 달라 실패도 따로 잡는다. 한쪽이 실패해도 다른 쪽은 정상 표시된다.
  let receivedFailure: Failure | undefined;
  let sentFailure: Failure | undefined;

  try {
    const [r, s] = await Promise.all([
      getReceivedInvitationsAction(),
      getSentInvitationsAction(),
    ]);
    received = r.data;
    sent = s.data;
    receivedFailure = r.success ? undefined : r.failure;
    sentFailure = s.success ? undefined : s.failure;
  } catch (error) {
    if (isRedirectError(error)) throw error;
    receivedFailure = toFailure(error);
    sentFailure = receivedFailure;
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
        <FlagInvitationTabs
          initialReceived={received}
          initialSent={sent}
          receivedFailure={receivedFailure}
          sentFailure={sentFailure}
        />
      </div>
    </div>
  );
}
