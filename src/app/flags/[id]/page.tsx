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

  // 1단계: 내 ID + 플래그 상세 병렬 조회
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

  // 2단계: 권한 확인 후 필요한 데이터만 조회
  const isHost = !!myUserId && flagData.host?.id === myUserId;
  const myParticipant = flagData.participants?.find((p) => p.id === myUserId);
  const isParticipant = isHost || !!myParticipant;
  const canInvite = isHost || myParticipant?.canInvite === true;

  const fetches = await Promise.all([
    // 댓글은 누구나 볼 수 있음
    getCommentsAction(id),
    // 친구 목록은 초대 권한이 있는 경우만 (호스트 또는 canInvite 참여자)
    canInvite ? apiClient.get<FriendshipDetail[]>("/api/v1/friends").catch(() => [] as FriendshipDetail[]) : Promise.resolve([] as FriendshipDetail[]),
    // 메모리얼 count는 참여자/호스트만 필요
    isParticipant ? getMemorialCountAction(id) : Promise.resolve({ success: true as const, count: 0 }),
  ]);

  if (fetches[0].success) comments = fetches[0].data;
  friends = fetches[1] as FriendshipDetail[];
  const memorialCountResult = fetches[2] as Awaited<ReturnType<typeof getMemorialCountAction>>;
  if (memorialCountResult.success) memorialCount = memorialCountResult.count;

  return <FlagDetail flag={flagData} myUserId={myUserId} friends={friends} memorialCount={memorialCount} comments={comments} />;
}
