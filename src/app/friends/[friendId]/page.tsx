import { redirect } from "next/navigation";
import { isRedirectError } from "@/api/apiClient";
import { getFriendProfileAction, getConnectionPathAction } from "@/app/actions/friendship";
import FriendProfile from "@/components/FriendProfile/FriendProfile";
import type { ConnectionPathResult } from "@/api/model/connectionPathResult";

export default async function FriendProfilePage({
  params,
}: {
  params: Promise<{ friendId: string }>;
}) {
  const { friendId: friendIdStr } = await params;
  const friendId = Number(friendIdStr);
  if (isNaN(friendId)) redirect("/");

  let profileData;
  try {
    const result = await getFriendProfileAction(friendId);
    if (!result.success) redirect("/");
    profileData = result.data;
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect("/");
  }

  if (!profileData) redirect("/");

  let pathData: ConnectionPathResult | null = null;
  try {
    const result = await getConnectionPathAction(friendId);
    if (result.success) pathData = result.data;
  } catch (error) {
    if (isRedirectError(error)) throw error;
    // 경로 조회 실패 시 섹션만 숨김
  }

  return <FriendProfile profile={profileData} path={pathData} />;
}
