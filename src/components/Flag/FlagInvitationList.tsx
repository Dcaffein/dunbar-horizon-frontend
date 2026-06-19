"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReceivedFlagInvitationResult } from "@/api/model/receivedFlagInvitationResult";
import { acceptInvitationAction, rejectInvitationAction } from "@/app/actions/flag";

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

interface InvitationCardProps {
  invitation: ReceivedFlagInvitationResult;
  onRemove: (id: number) => void;
}

function InvitationCard({ invitation, onRemove }: InvitationCardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    if (!invitation.id) return;
    setIsLoading(true);
    setError(null);
    const result = await acceptInvitationAction(invitation.id);
    if (result.success) {
      if (invitation.flagId) router.push(`/flags/${invitation.flagId}`);
    } else {
      setError(result.message ?? "수락에 실패했습니다.");
      setIsLoading(false);
    }
  }

  async function handleReject() {
    if (!invitation.id) return;
    setIsLoading(true);
    setError(null);
    const result = await rejectInvitationAction(invitation.id);
    if (result.success) {
      onRemove(invitation.id);
    } else {
      setError(result.message ?? "거절에 실패했습니다.");
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-4 my-3 rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.07)] overflow-hidden">
      <div className="px-4 pt-4 pb-4">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-2xl shrink-0">🚩</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 leading-snug">{invitation.flagTitle}</p>
            {invitation.flagDescription && (
              <p className="text-xs text-gray-500 mt-1">{invitation.flagDescription}</p>
            )}
            {invitation.inviterNickname && (
              <p className="text-xs text-gray-500 mt-1">{invitation.inviterNickname}님이 초대했어요</p>
            )}
            <p className="text-xs text-gray-400 mt-1.5">{relativeTime(invitation.createdAt)}</p>
          </div>
        </div>

        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

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
      </div>
    </div>
  );
}

interface FlagInvitationListProps {
  initialInvitations: ReceivedFlagInvitationResult[];
}

export default function FlagInvitationList({ initialInvitations }: FlagInvitationListProps) {
  const [invitations, setInvitations] = useState(initialInvitations);

  function handleRemove(id: number) {
    setInvitations((prev) => prev.filter((inv) => inv.id !== id));
  }

  if (invitations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <span className="text-4xl mb-3">🚩</span>
        <p className="text-sm font-medium">받은 초대가 없습니다.</p>
      </div>
    );
  }

  return (
    <ul className="py-2">
      {invitations.map((inv) => (
        <li key={inv.id}>
          <InvitationCard invitation={inv} onRemove={handleRemove} />
        </li>
      ))}
    </ul>
  );
}
