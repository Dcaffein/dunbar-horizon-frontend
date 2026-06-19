"use client";

import { useEffect } from "react";
import Link from "next/link";
import { getCurrentToken } from "@/lib/firebase";
import {
  registerDeviceTokenAction,
  removeDeviceTokenAction,
} from "@/app/actions/notification";

interface NotificationBellProps {
  initialUnreadCount: number;
}

export default function NotificationBell({ initialUnreadCount }: NotificationBellProps) {
  useEffect(() => {
    async function initFcmToken() {
      if (Notification.permission !== "granted") return;

      const currentToken = await getCurrentToken();
      const cachedToken = localStorage.getItem("fcmToken");

      if (currentToken === null) {
        // getToken 실패 = 브라우저 권한 취소됨
        if (cachedToken) {
          await removeDeviceTokenAction();
          localStorage.removeItem("fcmToken");
        }
        return;
      }

      if (currentToken === cachedToken) return;

      // 토큰 로테이션 발생
      await registerDeviceTokenAction(currentToken);
      localStorage.setItem("fcmToken", currentToken);
    }

    initFcmToken();
  }, []);

  const badgeCount = Math.min(initialUnreadCount, 99);

  return (
    <Link
      href="/notifications"
      className="relative flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-indigo-50"
      aria-label={`알림${initialUnreadCount > 0 ? ` ${initialUnreadCount}개 미읽음` : ""}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      알림
      {initialUnreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
          {badgeCount === 99 ? "99+" : badgeCount}
        </span>
      )}
    </Link>
  );
}
