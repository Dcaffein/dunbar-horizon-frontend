import { redirect } from "next/navigation";
import { getBuzzDetailAction } from "@/app/actions/buzz";
import BuzzDetail from "@/components/Buzz/BuzzDetail";
import { isRedirectError, apiClient } from "@/api/apiClient";

export default async function BuzzDetailPage({
  params,
}: {
  params: Promise<{ buzzId: string }>;
}) {
  const { buzzId } = await params;

  let myUserId: number | undefined;
  try {
    const profile = await apiClient.get<{ id: number }>("/api/v1/accounts/me");
    myUserId = profile.id;
  } catch (error) {
    if (isRedirectError(error)) throw error;
    // 비인증 외 에러는 무시 — myUserId 없으면 수정/삭제 버튼 안 보임
  }

  let buzzData;
  try {
    const result = await getBuzzDetailAction(buzzId);
    if (!result.success || !result.data) redirect("/buzzes");
    buzzData = result.data;
  } catch (error) {
    if (isRedirectError(error)) throw error;
    redirect("/buzzes");
  }

  if (!buzzData) redirect("/buzzes");
  return <BuzzDetail buzz={buzzData} myUserId={myUserId} />;
}
