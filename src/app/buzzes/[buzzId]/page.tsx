import { redirect } from "next/navigation";
import { getBuzzDetailAction } from "@/app/actions/buzz";
import BuzzDetail from "@/components/Buzz/BuzzDetail";
import { isRedirectError } from "@/api/apiClient";
import { cookies } from "next/headers";
import { BASE_URL } from "@/lib/constants";

export default async function BuzzDetailPage({
  params,
}: {
  params: Promise<{ buzzId: string }>;
}) {
  const { buzzId } = await params;
  // cookies()를 한 번만 읽어 myUserId 조회에 재사용
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  let myUserId: number | undefined;
  try {
    const meResp = await fetch(`${BASE_URL}/api/auth/users/me`, {
      headers: token ? { Cookie: `access_token=${token}` } : {},
      cache: "no-store",
    });
    if (meResp.ok) {
      const me = await meResp.json();
      myUserId = me.id;
    }
  } catch {
    // myUserId 없으면 수정/삭제 버튼 안 보임
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
