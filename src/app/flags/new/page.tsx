import FlagForm from "@/components/Flag/FlagForm";

export default async function FlagNewPage({
  searchParams,
}: {
  searchParams: Promise<{ parentFlagId?: string }>;
}) {
  const { parentFlagId } = await searchParams;

  return (
    <FlagForm parentFlagId={parentFlagId ? Number(parentFlagId) : undefined} />
  );
}
