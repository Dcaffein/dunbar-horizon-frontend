import { redirect } from "next/navigation";
import { getBuzzDetailAction } from "@/app/actions/buzz";
import BuzzDetail from "@/components/Buzz/BuzzDetail";
import { isRedirectError } from "@/api/apiClient";
import { apiClient } from "@/api/apiClient";

export default async function BuzzDetailPage({
  params,
}: {
  params: { buzzId: string };
}) {
  let myUserId: number | undefined;
  try {
    const profile = await apiClient.get<{ id: number }>("/api/v1/accounts/me");
    myUserId = profile.id;
  } catch {
    // 무시 — myUserId 없으면 수정/삭제 버튼 안 보임
  }

  try {
    const result = await getBuzzDetailAction(params.buzzId);
    if (!result.success || !result.data) redirect("/buzzes");

    return <BuzzDetail buzz={result.data} myUserId={myUserId} />;
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect("/buzzes");
  }
}
