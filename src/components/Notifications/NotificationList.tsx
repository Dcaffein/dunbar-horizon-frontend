"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { NotificationResponse } from "@/api/model/notificationResponse";
import { NotificationResponseType } from "@/api/model/notificationResponseType";
import { readNotificationAction, getNotificationsAction } from "@/app/actions/notification";
import { acceptInvitationAction, rejectInvitationAction } from "@/app/actions/flag";

const NOTIFICATION_ROUTES: Partial<Record<string, string>> = {
  [NotificationResponseType.FRIEND_REQUEST_ACCEPT]: "/",
  [NotificationResponseType.TRACE_REVEALED]: "/",
};

function typeIcon(type?: string): string {
  if (type === NotificationResponseType.FRIEND_REQUEST_ACCEPT) return "👤";
  if (type === NotificationResponseType.NOTICE) return "📢";
  if (type === NotificationResponseType.TRACE_REVEALED) return "👁️";
  if (type === NotificationResponseType.FLAG_INVITATION) return "🚩";
  if (type === NotificationResponseType.FLAG_ENCORE) return "🔁";
  return "🔔";
}

function relativeTime(createdAt?: string): string {
  if (!createdAt) return "";
  const diff = Date.now() - new Date(createdAt).getTime();
  const min = Math.floor(diff / 60000);
  const hour = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  if (hour < 24) return `${hour}시간 전`;
  if (day === 1) return "어제";
  return `${day}일 전`;
}

function extractMeta(notification: NotificationResponse): {
  invitationId?: number;
  flagId?: number;
} {
  const meta = notification.metadata as unknown as Record<string, unknown> | undefined;
  if (!meta) return {};
  return {
    invitationId: typeof meta.invitationId === "number" ? meta.invitationId : undefined,
    flagId: typeof meta.flagId === "number" ? meta.flagId : undefined,
  };
}

interface NotificationItemState {
  responded: boolean; // 수락 또는 거절 완료
}

interface NotificationListProps {
  initialNotifications: NotificationResponse[];
  initialHasMore: boolean;
}

export default function NotificationList({
  initialNotifications,
  initialHasMore,
}: NotificationListProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationResponse[]>(initialNotifications);
  const [itemStates, setItemStates] = useState<Record<string, NotificationItemState>>({});
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, isRead: true } : n),
    );
  }

  function markResponded(id: string) {
    setItemStates((prev) => ({ ...prev, [id]: { responded: true } }));
  }

  async function handleClick(notification: NotificationResponse) {
    if (!notification.id) return;

    if (!notification.isRead) {
      const result = await readNotificationAction(notification.id);
      if (result.success) markRead(notification.id);
    }

    const route = NOTIFICATION_ROUTES[notification.type ?? ""];
    if (route) router.push(route);
  }

  async function handleAccept(notification: NotificationResponse) {
    if (!notification.id) return;
    const { invitationId, flagId } = extractMeta(notification);
    if (!invitationId) return;

    const result = await acceptInvitationAction(invitationId);
    if (result.success) {
      markResponded(notification.id);
      if (!notification.isRead) {
        const readResult = await readNotificationAction(notification.id);
        if (readResult.success) markRead(notification.id);
      }
      if (flagId) router.push(`/flags/${flagId}`);
    }
  }

  async function handleReject(notification: NotificationResponse) {
    if (!notification.id) return;
    const { invitationId } = extractMeta(notification);
    if (!invitationId) return;

    const result = await rejectInvitationAction(invitationId);
    if (result.success) {
      markResponded(notification.id);
      if (!notification.isRead) {
        const readResult = await readNotificationAction(notification.id);
        if (readResult.success) markRead(notification.id);
      }
    }
  }

  async function handleLoadMore() {
    setIsLoadingMore(true);
    const nextPage = page + 1;
    const result = await getNotificationsAction(nextPage);
    if (result.success && result.data) {
      setNotifications((prev) => [...prev, ...(result.data!.content ?? [])]);
      setHasMore(!result.data.last);
      setPage(nextPage);
    }
    setIsLoadingMore(false);
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        <p className="text-sm font-medium">알림이 없습니다.</p>
      </div>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-gray-100">
        {notifications.map((n) => {
          const isFlagInvitation = n.type === NotificationResponseType.FLAG_INVITATION;
          const { invitationId } = extractMeta(n);
          const hasInvitationButtons = isFlagInvitation && !!invitationId && !itemStates[n.id ?? ""]?.responded;

          return (
            <li key={n.id}>
              <div
                className={`px-4 py-4 flex items-start gap-3 transition-colors ${
                  !n.isRead ? "bg-indigo-50" : "bg-white"
                }`}
              >
                {/* 미읽음 인디케이터 */}
                <div className="shrink-0 mt-1">
                  {!n.isRead ? (
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-transparent" />
                  )}
                </div>

                {/* 타입 아이콘 */}
                <span className="text-lg shrink-0">{typeIcon(n.type)}</span>

                {/* 내용 */}
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => handleClick(n)}
                    className="w-full text-left"
                  >
                    <p className={`text-sm ${!n.isRead ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                      {n.title}
                    </p>
                    {n.content && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{n.content}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{relativeTime(n.createdAt)}</p>
                  </button>

                  {/* FLAG_INVITATION 수락/거절 버튼 */}
                  {hasInvitationButtons && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleReject(n)}
                        className="text-xs px-3 py-1 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 font-medium"
                      >
                        거절
                      </button>
                      <button
                        onClick={() => handleAccept(n)}
                        className="text-xs px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                      >
                        수락
                      </button>
                    </div>
                  )}
                  {isFlagInvitation && itemStates[n.id ?? ""]?.responded && (
                    <p className="text-xs text-gray-400 mt-1">응답 완료</p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {hasMore && (
        <div className="flex justify-center py-4">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="text-sm text-indigo-600 font-medium hover:text-indigo-800 disabled:opacity-50"
          >
            {isLoadingMore ? "불러오는 중..." : "더 보기"}
          </button>
        </div>
      )}
    </div>
  );
}
