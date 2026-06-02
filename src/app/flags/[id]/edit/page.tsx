import { redirect } from "next/navigation";
import { isRedirectError } from "@/api/apiClient";
import { getFlagDetailAction } from "@/app/actions/flag";
import FlagForm from "@/components/Flag/FlagForm";
import type { FlagFormInitialValues } from "@/components/Flag/FlagForm";

function toLocalDatetimeValue(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function FlagEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) redirect("/flags");

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

  if (!flagData.isHost) redirect(`/flags/${id}`);

  const initialValues: FlagFormInitialValues = {
    title: flagData.title ?? "",
    description: flagData.description ?? "",
    startDateTime: toLocalDatetimeValue(flagData.schedule?.startDateTime),
    endDateTime: toLocalDatetimeValue(flagData.schedule?.endDateTime),
    deadline: toLocalDatetimeValue(flagData.schedule?.deadline),
    capacity: flagData.capacity != null ? String(flagData.capacity) : "",
  };

  return <FlagForm flagId={id} initialValues={initialValues} />;
}
