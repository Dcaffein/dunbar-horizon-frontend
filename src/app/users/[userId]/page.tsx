import { redirect } from "next/navigation";
import { isRedirectError } from "@/api/apiClient";
import { getFriendProfileAction } from "@/app/actions/friendship";
import { getSocialProfileAction } from "@/app/actions/social";
import { getLabelsAction } from "@/app/actions/label";
import FriendProfile from "@/components/FriendProfile/FriendProfile";
import PublicProfile from "@/components/UserProfile/PublicProfile";
import type { FriendshipDetailResult } from "@/api/model/friendshipDetailResult";
import type { SocialProfileResult } from "@/api/model/socialProfileResult";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId: userIdStr } = await params;
  const userId = Number(userIdStr);
  if (isNaN(userId)) redirect("/");

  let friendProfile: FriendshipDetailResult | null = null;
  let socialProfile: SocialProfileResult | null = null;

  try {
    const friendResult = await getFriendProfileAction(userId);
    if (friendResult.success && friendResult.data) {
      friendProfile = friendResult.data;
    }
  } catch (error) {
    if (isRedirectError(error)) throw error;
  }

  if (friendProfile) {
    const labelsResult = await getLabelsAction();
    const myLabels = (labelsResult.data ?? [])
      .filter((l) => l.members?.some((m) => m.id === userId));
    return <FriendProfile profile={friendProfile} userId={userId} myLabels={myLabels} />;
  }

  try {
    const socialResult = await getSocialProfileAction(userId);
    if (socialResult.success && socialResult.data) {
      socialProfile = socialResult.data;
    }
  } catch (error) {
    if (isRedirectError(error)) throw error;
  }

  if (socialProfile) {
    return <PublicProfile profile={socialProfile} userId={userId} />;
  }

  redirect("/");
}
