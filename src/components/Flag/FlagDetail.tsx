"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { FlagDetailResult } from "@/api/model/flagDetailResult";
import type { ParticipantResult } from "@/api/model/participantResult";
import type { MemorialResult } from "@/api/model/memorialResult";
import type { CommentResult } from "@/api/model/commentResult";
import type { FriendshipDetail } from "@/components/socialGraph/types";
import FlagMemorial from "./FlagMemorial";
import FlagComments from "./FlagComments";
import {
  closeRecruitmentAction,
  deleteFlagAction,
  participateAction,
  leaveAction,
  inviteFriendAction,
  updateInvitePermissionAction,
} from "@/app/actions/flag";

function formatDateTime(dt?: string): string {
  if (!dt) return "-";
  return new Date(dt).toLocaleString("ko-KR", {
    year: "numeric", month: "numeric", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function remainingLabel(endDateTime?: string): string {
  if (!endDateTime) return "";
  const diff = new Date(endDateTime).getTime() - Date.now();
  if (diff <= 0) return "종료됨";
  const h = Math.floor(diff / 3600000);
  if (h < 24) return `${h}시간 남음`;
  return `D-${Math.floor(h / 24)}`;
}

interface Toast {
  message: string;
  type: "success" | "error";
}

interface FlagDetailProps {
  flag: FlagDetailResult;
  myUserId?: number;
  friends: FriendshipDetail[];
  memorials: MemorialResult[];
  comments: CommentResult[];
}

export default function FlagDetail({ flag, myUserId, friends, memorials, comments }: FlagDetailProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ParticipantResult[]>(flag.participants ?? []);
  const [toast, setToast] = useState<Toast | null>(null);
  const [selectedFriendId, setSelectedFriendId] = useState<number | "">("");
  const [isInviting, setIsInviting] = useState(false);

  const isHost = flag.isHost ?? (!!myUserId && flag.host?.id === myUserId);
  const myParticipant = participants.find((p) => p.id === myUserId);
  const isParticipating = !!myParticipant;
  const canInvite = isHost || myParticipant?.canInvite === true;
  const isClosed = flag.status === "CLOSED";
  const rem = remainingLabel(flag.schedule?.endDateTime);

  const participantIds = new Set(participants.map((p) => p.id));
  const invitableFriends = friends.filter((f) => !participantIds.has(f.friendId));

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
  }

  async function handle(
    action: () => Promise<{ success: boolean; message?: string }>,
    afterPush?: string,
  ) {
    setIsLoading(true);
    setActionError(null);
    const result = await action();
    setIsLoading(false);
    if (result.success) {
      if (afterPush) router.push(afterPush);
      else router.refresh();
    } else {
      setActionError(result.message ?? "오류가 발생했습니다.");
    }
  }

  async function handleToggleCanInvite(participant: ParticipantResult) {
    if (!flag.id || !participant.id) return;
    const next = !participant.canInvite;
    const result = await updateInvitePermissionAction(flag.id, participant.id, next);
    if (result.success) {
      setParticipants((prev) =>
        prev.map((p) => p.id === participant.id ? { ...p, canInvite: next } : p),
      );
    } else {
      showToast(result.message ?? "권한 변경 실패", "error");
    }
  }

  async function handleInvite() {
    if (!flag.id || selectedFriendId === "") return;
    setIsInviting(true);
    const result = await inviteFriendAction(flag.id, selectedFriendId as number);
    setIsInviting(false);
    if (result.success) {
      showToast("초대가 전송되었습니다.");
      setSelectedFriendId("");
    } else {
      showToast(result.message ?? "초대 전송 실패", "error");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 토스트 */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg transition-all ${
            toast.type === "success"
              ? "bg-indigo-600 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <div className="flex items-center gap-1.5">
            {flag.parentFlagId && (
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">Encore</span>
            )}
            {isClosed && (
              <span className="text-xs font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">마감됨</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {rem && <span className="text-xs text-gray-400 font-medium">{rem}</span>}
          {isHost && (
            <Link
              href={`/flags/${flag.id}/edit`}
              className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              수정
            </Link>
          )}
          {isHost && (
            <Link
              href={`/flags/new?parentFlagId=${flag.id}`}
              className="text-xs px-2.5 py-1 border border-indigo-200 rounded-lg text-indigo-600 hover:bg-indigo-50"
            >
              Encore
            </Link>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* 본문 */}
        <div className="bg-white px-4 py-5 border-b">
          <h1 className="text-lg font-bold text-gray-900 mb-1">{flag.title}</h1>
          {flag.description && (
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{flag.description}</p>
          )}
        </div>

        {/* 이전 Flag */}
        {flag.parentFlag && (
          <div className="bg-indigo-50 px-4 py-3 border-b flex items-center justify-between">
            <p className="text-xs text-indigo-700 font-medium">
              원본 Flag: {flag.parentFlag.title}
            </p>
            <Link href={`/flags/${flag.parentFlag.id}`} className="text-xs text-indigo-600 underline">
              보기
            </Link>
          </div>
        )}

        {/* 일정 + 정원 */}
        <div className="bg-white px-4 py-4 border-b space-y-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">일정</p>
          <div className="space-y-1 text-sm text-gray-700">
            <div className="flex gap-2">
              <span className="text-gray-400 w-16 shrink-0">시작</span>
              <span>{formatDateTime(flag.schedule?.startDateTime)}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-400 w-16 shrink-0">종료</span>
              <span>{formatDateTime(flag.schedule?.endDateTime)}</span>
            </div>
            {flag.schedule?.deadline && (
              <div className="flex gap-2">
                <span className="text-gray-400 w-16 shrink-0">모집 마감</span>
                <span>{formatDateTime(flag.schedule.deadline)}</span>
              </div>
            )}
            <div className="flex gap-2">
              <span className="text-gray-400 w-16 shrink-0">정원</span>
              <span>
                {flag.participantCount ?? 0}
                {flag.capacity ? `/${flag.capacity}명` : "명 참여 중"}
              </span>
            </div>
          </div>
        </div>

        {/* 주최자 */}
        {flag.host && (
          <div className="bg-white px-4 py-4 border-b flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
              {flag.host.profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={flag.host.profileImageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-indigo-700 font-bold text-sm">{flag.host.nickname?.charAt(0) ?? "?"}</span>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-400">주최자</p>
              <p className="text-sm font-semibold text-gray-800">{flag.host.nickname}</p>
            </div>
          </div>
        )}

        {/* 참여자 목록 */}
        <div className="bg-white px-4 py-4 border-b">
          <p className="text-xs font-bold text-gray-500 mb-3">참여자 {participants.length}명</p>
          {participants.length === 0 ? (
            <p className="text-xs text-gray-400">아직 참여자가 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {participants.map((p) => (
                <li key={p.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                    {p.profileImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.profileImageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-500 font-bold text-xs">{p.nickname?.charAt(0) ?? "?"}</span>
                    )}
                  </div>
                  <span className="text-sm text-gray-700 flex-1">{p.nickname}</span>
                  {isHost && (
                    <button
                      onClick={() => handleToggleCanInvite(p)}
                      className={`text-xs px-2 py-0.5 rounded border transition ${
                        p.canInvite
                          ? "border-indigo-300 text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
                          : "border-gray-200 text-gray-400 hover:border-gray-300"
                      }`}
                    >
                      {p.canInvite ? "초대 가능 ✓" : "초대 불가"}
                    </button>
                  )}
                  {!isHost && p.canInvite && (
                    <span className="text-xs text-indigo-500">초대 가능</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 초대 섹션 */}
        {canInvite && (
          <div className="bg-white px-4 py-4 border-b">
            <p className="text-xs font-bold text-gray-500 mb-3">친구 초대</p>
            {invitableFriends.length === 0 ? (
              <p className="text-xs text-gray-400">초대 가능한 친구가 없습니다.</p>
            ) : (
              <div className="flex gap-2">
                <select
                  value={selectedFriendId}
                  onChange={(e) => setSelectedFriendId(e.target.value === "" ? "" : Number(e.target.value))}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
                >
                  <option value="">친구 선택</option>
                  {invitableFriends.map((f) => (
                    <option key={f.friendId} value={f.friendId}>
                      {f.friendAlias || f.friendNickname}
                    </option>
                  ))}
                </select>
                <button
                  disabled={isInviting || selectedFriendId === ""}
                  onClick={handleInvite}
                  className="text-sm px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium shrink-0"
                >
                  {isInviting ? "전송 중..." : "초대"}
                </button>
              </div>
            )}
          </div>
        )}
        {/* 댓글 섹션 */}
        {flag.id && (
          <FlagComments
            flagId={flag.id}
            initialComments={comments}
          />
        )}

        {/* Memorial 섹션 */}
        {flag.id && (
          <FlagMemorial
            flagId={flag.id}
            initialMemorials={memorials}
            myUserId={myUserId}
            isParticipant={isHost || isParticipating}
          />
        )}
      </div>

      {/* 액션 버튼 */}
      <div className="bg-white border-t border-gray-200 px-4 py-4 shrink-0">
        {actionError && <p className="text-xs text-red-500 mb-2">{actionError}</p>}
        <div className="flex gap-2 max-w-lg mx-auto">
          {isHost && (
            <>
              {!isClosed && (
                <button
                  disabled={isLoading}
                  onClick={() => handle(() => closeRecruitmentAction(flag.id!))}
                  className="flex-1 py-2.5 text-sm font-medium border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  모집 마감
                </button>
              )}
              <button
                disabled={isLoading}
                onClick={() => handle(() => deleteFlagAction(flag.id!), "/flags")}
                className="flex-1 py-2.5 text-sm font-medium border border-red-200 rounded-xl text-red-500 hover:bg-red-50 disabled:opacity-50"
              >
                삭제
              </button>
            </>
          )}
          {isParticipating && !isHost && (
            <button
              disabled={isLoading}
              onClick={() => handle(() => leaveAction(flag.id!))}
              className="flex-1 py-2.5 text-sm font-medium border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              참여 취소
            </button>
          )}
          {!isHost && !isParticipating && (
            <button
              disabled={isLoading || isClosed}
              onClick={() => handle(() => participateAction(flag.id!))}
              className="flex-1 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isClosed ? "모집 마감됨" : "참여하기"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
