import Link from "next/link";
import { isRedirectError, toFailure } from "@/api/apiClient";
import type { Failure } from "@/api/apiClient";
import {
  getHostingFlagsAction,
  getParticipatingFlagsAction,
} from "@/app/actions/flag";
import FlagList from "@/components/Flag/FlagList";
import type { FlagPage } from "@/components/Flag/flagPage";

export default async function FlagsPage() {
  let hosting: FlagPage = { flags: [], page: 0, isLast: true };
  let participating: FlagPage = { flags: [], page: 0, isLast: true };
  // 탭별 실패를 분리해 한쪽 실패를 다른 탭의 빈 목록으로 위장하지 않는다.
  let hostingFailure: Failure | undefined;
  let participatingFailure: Failure | undefined;

  try {
    const [h, p] = await Promise.all([
      getHostingFlagsAction(),
      getParticipatingFlagsAction(),
    ]);
    hosting = h.data;
    participating = p.data;
    hostingFailure = h.success ? undefined : h.failure;
    participatingFailure = p.success ? undefined : p.failure;
  } catch (error) {
    if (isRedirectError(error)) throw error;
    hostingFailure = toFailure(error);
    participatingFailure = hostingFailure;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-gray-500 hover:text-indigo-600 transition-colors" aria-label="뒤로가기">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Flag</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/flags/invitations"
            className="text-sm font-medium text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            초대
          </Link>
          <Link
            href="/flags/new"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            + 만들기
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto">
        <FlagList
          initialHosting={hosting}
          initialParticipating={participating}
          hostingFailure={hostingFailure}
          participatingFailure={participatingFailure}
        />
      </main>
    </div>
  );
}
