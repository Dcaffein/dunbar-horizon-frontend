"use client";

import { logoutAction } from "@/app/actions/auth";

export default function LogoutButton() {
  const handleLogout = async () => {
    const fcmToken = localStorage.getItem("fcmToken") ?? undefined;
    localStorage.removeItem("fcmToken");
    await logoutAction(fcmToken);
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
    >
      로그아웃
    </button>
  );
}
