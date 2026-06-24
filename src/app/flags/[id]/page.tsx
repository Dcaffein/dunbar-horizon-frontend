import { redirect } from "next/navigation";
import { isRedirectError, apiClient } from "@/api/apiClient";
import { getFlagDetailAction, getMemorialCountAction, getCommentsAction } from "@/app/actions/flag";
import FlagDetail from "@/components/Flag/FlagDetail";
import type { FriendshipDetail } from "@/components/socialGraph/types";
import type { CommentResult } from "@/api/model/commentResult";

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
  let memorialCount = 0;
  let comments: CommentResult[] = [];

  // 1단계: 권한 불필요한 요청 전부 동시 실행
  let flagData;
  try {
    const [profile, flagResult, commentsResult, memorialCountResult] = await Promise.all([
      apiClient.get<{ id: number }>("/api/v1/users/me").catch(() => null),
      getFlagDetailAction(id),
      getCommentsAction(id),
      getMemorialCountAction(id),
    ]);
    if (profile) myUserId = profile.id;
    if (!flagResult.success || !flagResult.data) redirect("/flags");
    flagData = flagResult.data;
    if (commentsResult.success) comments = commentsResult.data;
    if (memorialCountResult.success) memorialCount = memorialCountResult.count;
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect("/flags");
  }

  if (!flagData) redirect("/flags");

  // 2단계: 권한 계산 후 friends만 조건부 조회
  const isHost = !!myUserId && flagData.host?.id === myUserId;
  const myParticipant = flagData.participants?.find((p) => p.id === myUserId);
  const canInvite = isHost || myParticipant?.canInvite === true;

  if (canInvite) {
    friends = await apiClient.get<FriendshipDetail[]>("/api/v1/friends").catch(() => []);
  }

  return <FlagDetail flag={flagData} myUserId={myUserId} friends={friends} memorialCount={memorialCount} comments={comments} />;
}
