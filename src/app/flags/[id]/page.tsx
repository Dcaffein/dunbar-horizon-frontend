import { redirect } from "next/navigation";
import { isRedirectError, apiClient } from "@/api/apiClient";
import { getFlagDetailAction } from "@/app/actions/flag";
import FlagDetail from "@/components/Flag/FlagDetail";
import type { FriendshipDetail } from "@/components/socialGraph/types";

export default async function FlagDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) redirect("/flags");

  let myUserId: number | undefined;
  let friends: FriendshipDetail[] = [];

  let flagData;
  try {
    const [profile, flagResult] = await Promise.all([
      apiClient.get<{ id: number }>("/api/v1/users/me").catch(() => null),
      getFlagDetailAction(id),
    ]);
    if (profile) myUserId = profile.id;
    if (!flagResult.success || !flagResult.data) redirect("/flags");
    flagData = flagResult.data;
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect("/flags");
  }

  if (!flagData) redirect("/flags");

  const isHost = !!myUserId && flagData.host?.id === myUserId;
  const myParticipant = flagData.participants?.find((p) => p.id === myUserId);
  const canInvite = isHost || myParticipant?.canInvite === true;

  if (canInvite) {
    friends = await apiClient.get<FriendshipDetail[]>("/api/v1/friends").catch(() => []);
  }

  return <FlagDetail flag={flagData} myUserId={myUserId} friends={friends} />;
}
