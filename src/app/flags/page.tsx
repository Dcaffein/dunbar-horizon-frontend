import Link from "next/link";
import { isRedirectError } from "@/api/apiClient";
import {
  getHostingFlagsAction,
  getParticipatingFlagsAction,
  getFriendFlagsAction,
} from "@/app/actions/flag";
import FlagList from "@/components/Flag/FlagList";
import type { FlagResult } from "@/api/model/flagResult";

export default async function FlagsPage() {
  let hosting: FlagResult[] = [];
  let participating: FlagResult[] = [];
  let friends: FlagResult[] = [];

  try {
    const [h, p, f] = await Promise.all([
      getHostingFlagsAction(),
      getParticipatingFlagsAction(),
      getFriendFlagsAction(),
    ]);
    hosting = h.data;
    participating = p.data;
    friends = f.data;
  } catch (error) {
    if (isRedirectError(error)) throw error;
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
        <Link
          href="/flags/new"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          + 만들기
        </Link>
      </header>

      <main className="max-w-lg mx-auto">
        <FlagList
          initialHosting={hosting}
          initialParticipating={participating}
          initialBrowse={friends}
        />
      </main>
    </div>
  );
}
