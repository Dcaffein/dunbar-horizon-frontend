import { redirect } from "next/navigation";
import MyProfile from "@/components/MyProfile/MyProfile";
import { getMyProfileAction } from "@/app/actions/profile";

export default async function ProfilePage() {
  const result = await getMyProfileAction();
  if (!result.success) redirect("/");
  return <MyProfile profile={result.data} />;
}
