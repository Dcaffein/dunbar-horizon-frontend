import { redirect } from "next/navigation";
import { isRedirectError } from "@/api/apiClient";
import { getFriendProfileAction, getConnectionPathAction } from "@/app/actions/friendship";
import { recordTraceAction } from "@/app/actions/social";
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
  let revealed = false;

  const [pathResult, traceResult] = await Promise.all([
    getConnectionPathAction(friendId).catch(() => null),
    recordTraceAction(friendId).catch(() => null),
  ]);

  if (pathResult && pathResult.success) pathData = pathResult.data;
  if (traceResult && traceResult.success) revealed = traceResult.data?.revealed === true;

  return <FriendProfile profile={profileData} path={pathData} revealed={revealed} />;
}
