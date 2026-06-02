import { redirect } from "next/navigation";
import { getBuzzDetailAction } from "@/app/actions/buzz";
import BuzzDetail from "@/components/Buzz/BuzzDetail";
import { isRedirectError } from "@/api/apiClient";

export default async function BuzzDetailPage({
  params,
}: {
  params: Promise<{ buzzId: string }>;
}) {
  const { buzzId } = await params;

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
  return <BuzzDetail buzz={buzzData} />;
}
