import { redirect } from "next/navigation";
import { isRedirectError } from "@/api/apiClient";
import { getFriendProfileAction } from "@/app/actions/friendship";
import { getSocialProfileAction } from "@/app/actions/social";
import { getLabelsAction } from "@/app/actions/label";
import FriendProfile from "@/components/FriendProfile/FriendProfile";
import PublicProfile from "@/components/UserProfile/PublicProfile";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId: userIdStr } = await params;
  const userId = Number(userIdStr);
  if (isNaN(userId)) redirect("/");

  const [friendResult, labelsResult] = await Promise.all([
    getFriendProfileAction(userId).catch((error) => {
      if (isRedirectError(error)) throw error;
      return null;
    }),
    getLabelsAction().catch((error) => {
      if (isRedirectError(error)) throw error;
      return { success: false as const, data: [] };
    }),
  ]);

  if (friendResult?.success && friendResult.data) {
    const myLabels = (labelsResult.data ?? [])
      .filter((l) => l.members?.some((m) => m.id === userId));
    return <FriendProfile profile={friendResult.data} userId={userId} myLabels={myLabels} />;
  }

  const socialResult = await getSocialProfileAction(userId).catch((error) => {
    if (isRedirectError(error)) throw error;
    return null;
  });

  if (socialResult?.success && socialResult.data) {
    return <PublicProfile profile={socialResult.data} userId={userId} />;
  }

  redirect("/");
}
