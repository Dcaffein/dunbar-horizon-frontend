import { redirect } from "next/navigation";
import { isRedirectError } from "@/api/apiClient";
import FlagDetail from "@/components/Flag/FlagDetail";
import type { FriendshipDetail } from "@/components/socialGraph/types";
import type { FlagDetailResult } from "@/api/model/flagDetailResult";
import { cookies } from "next/headers";
import { BASE_URL } from "@/lib/constants";

export default async function FlagDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) redirect("/flags");

  // cookies()를 한 번만 읽어 모든 fetch에 재사용 (apiClient 우회)
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const cookieHeader: HeadersInit = token ? { Cookie: `access_token=${token}` } : {};

  let myUserId: number | undefined;
  let friends: FriendshipDetail[] = [];

  try {
    const friendsResp = await fetch(`${BASE_URL}/api/v1/friends`, {
      headers: cookieHeader,
      cache: "no-store",
    });
    if (friendsResp.ok) friends = await friendsResp.json();
  } catch {
    // 친구 목록 실패는 무시
  }

  let flagData: FlagDetailResult | undefined;
  try {
    const flagResp = await fetch(`${BASE_URL}/api/v1/flags/${id}`, {
      headers: cookieHeader,
      cache: "no-store",
    });
    if (!flagResp.ok) redirect("/flags");
    flagData = await flagResp.json();
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("[DEBUG] CAUGHT:", error);
    redirect("/flags");
  }

  if (!flagData) redirect("/flags");
  return <FlagDetail flag={flagData} myUserId={myUserId} friends={friends} />;
}
