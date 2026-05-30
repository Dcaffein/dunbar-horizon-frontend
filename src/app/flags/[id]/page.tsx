import { redirect } from "next/navigation";
import { isRedirectError, apiClient } from "@/api/apiClient";
import { getFlagDetailAction } from "@/app/actions/flag";
import FlagDetail from "@/components/Flag/FlagDetail";
import type { FriendshipDetail } from "@/components/socialGraph/types";

export default async function FlagDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (isNaN(id)) redirect("/flags");

  let myUserId: number | undefined;
  let friends: FriendshipDetail[] = [];

  try {
    const [profile, friendsData] = await Promise.all([
      apiClient.get<{ id: number }>("/api/v1/accounts/me"),
      apiClient.get<FriendshipDetail[]>("/api/v1/friends"),
    ]);
    myUserId = profile.id;
    friends = friendsData;
  } catch {
    // myUserId 없으면 host/참여 버튼 숨김, friends 없으면 초대 섹션 빈 상태
  }

  let flagData;
  try {
    const result = await getFlagDetailAction(id);
    if (!result.success || !result.data) redirect("/flags");
    flagData = result.data;
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect("/flags");
  }

  if (!flagData) redirect("/flags");
  return <FlagDetail flag={flagData} myUserId={myUserId} friends={friends} />;
}
