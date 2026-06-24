import { redirect } from "next/navigation";
import Link from "next/link";
import { isRedirectError, apiClient } from "@/api/apiClient";
import { getFlagDetailAction, getMemorialsAction } from "@/app/actions/flag";
import FlagMemorial from "@/components/Flag/FlagMemorial";
import type { MemorialResult } from "@/api/model/memorialResult";

export default async function FlagMemorialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) redirect("/flags");

  const [profile, flagResult, memorialsResult] = await Promise.all([
    apiClient.get<{ id: number }>("/api/v1/users/me").catch((error) => {
      if (isRedirectError(error)) throw error;
      return null;
    }),
    getFlagDetailAction(id).catch((error) => {
      if (isRedirectError(error)) throw error;
      return null;
    }),
    getMemorialsAction(id).catch((error) => {
      if (isRedirectError(error)) throw error;
      return null;
    }),
  ]);

  if (!flagResult || !flagResult.success || !flagResult.data) redirect("/flags");
  const flagData = flagResult.data;

  const isEnded = flagData.status === "ENDED" || (!!flagData.schedule?.endDateTime && new Date(flagData.schedule.endDateTime) < new Date());
  if (!isEnded) redirect(`/flags/${id}`);

  const myUserId = profile?.id;
  const isHost = flagData.isHost ?? (!!myUserId && flagData.host?.id === myUserId);
  const myParticipant = flagData.participants?.find((p) => p.id === myUserId);
  const isParticipant = isHost || !!myParticipant;

  const myNickname = isHost ? flagData.host?.nickname : myParticipant?.nickname;
  const myProfileImageUrl = isHost ? flagData.host?.profileImageUrl : myParticipant?.profileImageUrl;

  const memorials: MemorialResult[] = memorialsResult?.success ? memorialsResult.data : [];
  const locked = memorialsResult ? (memorialsResult.success ? memorialsResult.locked : true) : true;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 shrink-0">
        <Link href={`/flags/${id}`} replace className="text-gray-400 hover:text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <div>
          <h1 className="text-base font-bold text-gray-900">Memorial</h1>
          <p className="text-xs text-gray-400">{flagData.title}</p>
        </div>
      </header>
      <div className="flex-1 max-w-lg mx-auto w-full">
        <FlagMemorial
          flagId={id}
          initialMemorials={memorials}
          myUserId={myUserId}
          myNickname={myNickname}
          myProfileImageUrl={myProfileImageUrl}
          isParticipant={isParticipant}
          locked={locked}
        />
      </div>
    </div>
  );
}
