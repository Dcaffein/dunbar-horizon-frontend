import { getLabelsAction } from "@/app/actions/buzz";
import BuzzForm from "@/components/Buzz/BuzzForm";
import { apiClient, isRedirectError } from "@/api/apiClient";
import type { FriendshipDetail } from "@/components/socialGraph/types";
import type { LabelResult } from "@/api/model/labelResult";

export default async function BuzzNewPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const { to } = await searchParams;
  const initialMemberId = to ? Number(to) : undefined;

  let friends: FriendshipDetail[] = [];
  let labels: LabelResult[] = [];

  try {
    const [friendsData, labelsResult] = await Promise.all([
      apiClient.get<FriendshipDetail[]>("/api/v1/friends"),
      getLabelsAction(),
    ]);
    friends = friendsData;
    if (labelsResult.success) labels = labelsResult.data;
  } catch (error) {
    if (isRedirectError(error)) throw error;
  }

  return <BuzzForm friends={friends} labels={labels} initialMemberId={initialMemberId} />;
}
