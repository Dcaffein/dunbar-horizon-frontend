import { redirect } from "next/navigation";
import { isRedirectError, apiClient } from "@/api/apiClient";
import { getFlagDetailAction } from "@/app/actions/flag";
import FlagDetail from "@/components/Flag/FlagDetail";

export default async function FlagDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (isNaN(id)) redirect("/flags");

  let myUserId: number | undefined;
  try {
    const profile = await apiClient.get<{ id: number }>("/api/v1/accounts/me");
    myUserId = profile.id;
  } catch {
    // myUserId 없으면 host/참여 버튼 숨김
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
  return <FlagDetail flag={flagData} myUserId={myUserId} />;
}
