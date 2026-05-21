import { logoutAction } from "@/app/actions/auth";

export default function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button type="submit">로그아웃</button>
    </form>
  );
}
