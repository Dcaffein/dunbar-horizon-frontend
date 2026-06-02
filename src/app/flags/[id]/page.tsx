import { redirect } from "next/navigation";
import { isRedirectError, apiClient } from "@/api/apiClient";
import { getFlagDetailAction, getMemorialsAction, getCommentsAction } from "@/app/actions/flag";
import FlagDetail from "@/components/Flag/FlagDetail";
import type { FriendshipDetail } from "@/components/socialGraph/types";
import type { MemorialResult } from "@/api/model/memorialResult";
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
  let memorials: MemorialResult[] = [];
  let comments: CommentResult[] = [];

  try {
    const [profile, friendsData] = await Promise.all([
      apiClient.get<{ id: number }>("/api/v1/users/me"),
      apiClient.get<FriendshipDetail[]>("/api/v1/friends"),
    ]);
    myUserId = profile.id;
    friends = friendsData;
  } catch (error) {
    if (isRedirectError(error)) throw error;
    // 비인증 외 에러(404 등)는 무시 — myUserId 없으면 버튼 숨김, friends 없으면 초대 섹션 빈 상태
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

  const [memorialsResult, commentsResult] = await Promise.all([
    getMemorialsAction(id),
    getCommentsAction(id),
  ]);
  if (memorialsResult.success) memorials = memorialsResult.data;
  if (commentsResult.success) comments = commentsResult.data;

  return <FlagDetail flag={flagData} myUserId={myUserId} friends={friends} memorials={memorials} comments={comments} />;
}
