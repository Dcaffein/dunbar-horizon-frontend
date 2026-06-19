import { redirect } from "next/navigation";

export default async function FriendProfilePage({
  params,
}: {
  params: Promise<{ friendId: string }>;
}) {
  const { friendId } = await params;
  redirect(`/users/${friendId}`);
}
