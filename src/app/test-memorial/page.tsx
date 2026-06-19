import FlagMemorial from "@/components/Flag/FlagMemorial";
import type { MemorialResult } from "@/api/model/memorialResult";
import Link from "next/link";

const FLAG_ID = 2;
const MY_USER_ID = 2;

const MOCK_MEMORIALS: MemorialResult[] = [
  {
    id: 1,
    writerId: 2,
    nickname: "지민",
    content: "정말 즐거웠어요! 다음에도 꼭 하고 싶어요 🧗\n처음엔 자신 없었는데 생각보다 재밌었어요.",
    createdAt: "2026-05-10T14:30:00",
  },
  {
    id: 2,
    writerId: 3,
    nickname: "현우",
    content: "초보자도 잘 따라갈 수 있었어요. 강사님도 친절했고!",
    createdAt: "2026-05-10T15:00:00",
  },
  {
    id: 3,
    writerId: 4,
    nickname: "소연",
    content: "손이 너무 아팠지만... 또 가고 싶다 😂",
    createdAt: "2026-05-10T16:00:00",
  },
];

export default function TestMemorialPage({
  searchParams,
}: {
  searchParams: Promise<{ locked?: string }>;
}) {
  return (
    <Resolved searchParams={searchParams} />
  );
}

async function Resolved({ searchParams }: { searchParams: Promise<{ locked?: string }> }) {
  const { locked: lockedParam } = await searchParams;
  const locked = lockedParam === "1";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 shrink-0">
        <Link href="/test-flag-detail" className="text-gray-400 hover:text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-base font-bold text-gray-900">Memorial</h1>
          <p className="text-xs text-gray-400">5월 클라이밍 모임</p>
        </div>
      </header>
      <div className="flex-1 max-w-lg mx-auto w-full">
        <FlagMemorial
          flagId={FLAG_ID}
          initialMemorials={locked ? [] : MOCK_MEMORIALS}
          myUserId={MY_USER_ID}
          isParticipant
          locked={locked}
        />
      </div>
    </div>
  );
}
