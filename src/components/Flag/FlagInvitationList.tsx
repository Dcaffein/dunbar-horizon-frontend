"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { NotificationResponse } from "@/api/model/notificationResponse";
import { acceptInvitationAction, rejectInvitationAction } from "@/app/actions/flag";
import { readNotificationAction } from "@/app/actions/notification";

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

function extractMeta(n: NotificationResponse): { invitationId?: number; flagId?: number } {
  const meta = n.metadata as unknown as Record<string, unknown> | undefined;
  if (!meta) return {};
  return {
    invitationId: typeof meta.invitationId === "number" ? meta.invitationId : undefined,
    flagId: typeof meta.flagId === "number" ? meta.flagId : undefined,
  };
}

interface InvitationCardProps {
  notification: NotificationResponse;
}

function InvitationCard({ notification: n }: InvitationCardProps) {
  const router = useRouter();
  const [responded, setResponded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { invitationId, flagId } = extractMeta(n);

  async function markRead() {
    if (n.id && !n.isRead) {
      await readNotificationAction(n.id);
    }
  }

  async function handleAccept() {
    if (!invitationId) return;
    setIsLoading(true);
    setError(null);
    const result = await acceptInvitationAction(invitationId);
    if (result.success) {
      await markRead();
      setResponded(true);
      if (flagId) router.push(`/flags/${flagId}`);
    } else {
      setError(result.message ?? "수락에 실패했습니다.");
      setIsLoading(false);
    }
  }

  async function handleReject() {
    if (!invitationId) return;
    setIsLoading(true);
    setError(null);
    const result = await rejectInvitationAction(invitationId);
    if (result.success) {
      await markRead();
      setResponded(true);
    } else {
      setError(result.message ?? "거절에 실패했습니다.");
    }
    setIsLoading(false);
  }

  return (
    <div className="mx-4 my-3 rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.07)] overflow-hidden">
      <div className="px-4 pt-4 pb-4">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-2xl shrink-0">🚩</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 leading-snug">{n.title}</p>
            {n.content && (
              <p className="text-xs text-gray-500 mt-1">{n.content}</p>
            )}
            <p className="text-xs text-gray-400 mt-1.5">{relativeTime(n.createdAt)}</p>
          </div>
        </div>

        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

        {responded ? (
          <p className="text-xs text-gray-400 text-center py-1">응답 완료</p>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              disabled={isLoading}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              거절
            </button>
            <button
              onClick={handleAccept}
              disabled={isLoading}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              수락
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface FlagInvitationListProps {
  initialInvitations: NotificationResponse[];
}

export default function FlagInvitationList({ initialInvitations }: FlagInvitationListProps) {
  if (initialInvitations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <span className="text-4xl mb-3">🚩</span>
        <p className="text-sm font-medium">받은 초대가 없습니다.</p>
      </div>
    );
  }

  return (
    <ul className="py-2">
      {initialInvitations.map((n) => (
        <li key={n.id}>
          <InvitationCard notification={n} />
        </li>
      ))}
    </ul>
  );
}
