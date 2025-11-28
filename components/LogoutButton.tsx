"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });

    router.push("/login");
    router.refresh();
  };

  return <button onClick={handleLogout}>로그아웃</button>;
}
