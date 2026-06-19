import Link from "next/link";
import { getReceivedBuzzesAction, getSentBuzzesAction } from "@/app/actions/buzz";
import BuzzTabs from "@/components/Buzz/BuzzTabs";
import { isRedirectError } from "@/api/apiClient";
import type { BuzzSummaryResult } from "@/api/model/buzzSummaryResult";

export default async function BuzzesPage() {
  let receivedBuzzes: BuzzSummaryResult[] = [];
  let receivedHasMore = false;
  let sentBuzzes: BuzzSummaryResult[] = [];
  let sentHasMore = false;

  try {
    const [receivedResult, sentResult] = await Promise.all([
      getReceivedBuzzesAction(0),
      getSentBuzzesAction(0),
    ]);
    if (receivedResult.success && receivedResult.data) {
      receivedBuzzes = receivedResult.data.content ?? [];
      receivedHasMore = !receivedResult.data.last;
    }
    if (sentResult.success && sentResult.data) {
      sentBuzzes = sentResult.data.content ?? [];
      sentHasMore = !sentResult.data.last;
    }
  } catch (error) {
    if (isRedirectError(error)) throw error;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-gray-500 hover:text-orange-600 transition-colors"
            aria-label="뒤로가기"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Buzz</h1>
        </div>
        <Link
          href="/buzzes/new"
          className="text-sm font-medium text-orange-600 hover:text-orange-700 px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-colors"
        >
          + 작성
        </Link>
      </header>

      <main className="max-w-lg mx-auto">
        <BuzzTabs
          receivedBuzzes={receivedBuzzes}
          receivedHasMore={receivedHasMore}
          sentBuzzes={sentBuzzes}
          sentHasMore={sentHasMore}
        />
      </main>
    </div>
  );
}
