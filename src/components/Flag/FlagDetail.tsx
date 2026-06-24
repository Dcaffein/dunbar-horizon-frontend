"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { FlagDetailResult } from "@/api/model/flagDetailResult";
import type { ParticipantResult } from "@/api/model/participantResult";
import type { CommentResult } from "@/api/model/commentResult";
import type { FriendshipDetail } from "@/components/socialGraph/types";
import FlagComments from "./FlagComments";
import {
  closeRecruitmentAction,
  deleteFlagAction,
  participateAction,
  leaveAction,
  inviteFriendAction,
  updateInvitePermissionAction,
  getFlagDetailAction,
  getCommentsAction,
  getMemorialCountAction,
} from "@/app/actions/flag";

function fmt(dt: string): string {
  const d = new Date(dt);
  return `${d.getMonth() + 1}. ${d.getDate()}. ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDateRange(start?: string, end?: string): string {
  if (!start) return "-";
  if (!end) return fmt(start);
  const s = new Date(start);
  const e = new Date(end);
  const endStr = s.toDateString() === e.toDateString()
    ? `${String(e.getHours()).padStart(2, "0")}:${String(e.getMinutes()).padStart(2, "0")}`
    : fmt(end);
  return `${fmt(start)} ~ ${endStr}`;
}

function formatDateShort(dt?: string): string {
  if (!dt) return "-";
  return fmt(dt);
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
}

export default function FlagDetail({ flag, myUserId, friends }: FlagDetailProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ParticipantResult[]>(flag.participants ?? []);
  const [comments, setComments] = useState<CommentResult[]>([]);
  const [memorialCount, setMemorialCount] = useState(0);

  useEffect(() => {
    if (!flag.id) return;
    Promise.all([
      getCommentsAction(flag.id),
      getMemorialCountAction(flag.id),
    ]).then(([commentsResult, memorialResult]) => {
      if (commentsResult.success) setComments(commentsResult.data);
      if (memorialResult.success) setMemorialCount(memorialResult.count);
    });
  }, [flag.id]);

  useEffect(() => {
    setParticipants(flag.participants ?? []);
  }, [flag.participants]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [selectedFriendId, setSelectedFriendId] = useState<number | "">("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const isHost = flag.isHost ?? (!!myUserId && flag.host?.id === myUserId);
  const myParticipant = participants.find((p) => p.id === myUserId);
  const isParticipating = !!myParticipant;
  const canInvite = isHost || myParticipant?.canInvite === true;
  const isClosed = flag.status === "WAITING" || flag.status === "ENDED";
  const isEnded = flag.status === "ENDED" || (!!flag.schedule?.endDateTime && new Date(flag.schedule.endDateTime) < new Date());
  const rem = remainingLabel(flag.schedule?.endDateTime);

  const participantIds = new Set(participants.map((p) => p.id));
  const invitableFriends = friends
    .filter((f) => !participantIds.has(f.friendId))
    .sort((a, b) => (a.friendAlias || a.friendNickname).localeCompare(b.friendAlias || b.friendNickname, "ko"));
  const friendIdSet = new Set(friends.map((f) => f.friendId));

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

  async function handleLeave() {
    if (!flag.id || !myUserId) return;
    setIsLoading(true);
    const result = await leaveAction(flag.id);
    setIsLoading(false);
    if (result.success) {
      setParticipants((prev) => prev.filter((p) => p.id !== myUserId));
    } else {
      setActionError(result.message ?? "참여 취소에 실패했습니다.");
    }
  }

  async function handleParticipate() {
    if (!flag.id) return;
    setIsLoading(true);
    const result = await participateAction(flag.id);
    if (result.success) {
      const updated = await getFlagDetailAction(flag.id);
      if (updated.success && updated.data?.participants) {
        setParticipants(updated.data.participants);
      }
    } else {
      setActionError(result.message ?? "참여에 실패했습니다.");
    }
    setIsLoading(false);
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
          {isHost && !isClosed && (
            <Link
              href={`/flags/${flag.id}/edit`}
              className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              수정
            </Link>
          )}
          {isHost && isEnded && (
            <Link
              href={`/flags/new?parentFlagId=${flag.id}`}
              className="text-xs px-2.5 py-1 border border-indigo-200 rounded-lg text-indigo-600 hover:bg-indigo-50"
            >
              앙코르
            </Link>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto">
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
        <div className="bg-white px-4 py-4 border-b">
          <p className="text-xs font-semibold text-indigo-500 mb-2">일정</p>
          <div className="bg-indigo-50 rounded-xl px-4 py-3 space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="text-base">📅</span>
              <span className="text-sm font-medium text-gray-800">
                {formatDateRange(flag.schedule?.startDateTime, flag.schedule?.endDateTime)}
              </span>
            </div>
            {flag.schedule?.deadline && (
              <div className="flex items-center gap-2.5">
                <span className="text-base">⏰</span>
                <span className="text-sm text-gray-600">
                  모집 마감 · {formatDateShort(flag.schedule.deadline)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <span className="text-base">👥</span>
              <span className="text-sm font-medium text-gray-800">
                {flag.capacity
                  ? `${flag.participantCount ?? 0} / ${flag.capacity}명`
                  : `${flag.participantCount ?? 0}명 참여`}
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
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-indigo-500">참여자 {participants.length}명</p>
            {canInvite && (
              <button
                onClick={() => setInviteModalOpen(true)}
                className="text-xs text-indigo-600 font-medium hover:text-indigo-800"
              >
                초대하기
              </button>
            )}
          </div>
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
                  {p.id != null && friendIdSet.has(p.id) ? (
                    <Link href={`/friends/${p.id}`} className="text-sm text-indigo-600 hover:underline flex-1">
                      {p.nickname}
                    </Link>
                  ) : (
                    <span className="text-sm text-gray-700 flex-1">{p.nickname}</span>
                  )}
                  {isHost && (
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={p.canInvite ?? false}
                        onChange={() => handleToggleCanInvite(p)}
                        className="w-3.5 h-3.5 rounded accent-indigo-600 cursor-pointer"
                      />
                      <span className="text-xs text-gray-500">초대권한</span>
                    </label>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 댓글 섹션 */}
        {flag.id && (
          <FlagComments
            flagId={flag.id}
            initialComments={comments}
            myWriterInfo={
              isHost
                ? { id: flag.host?.id, nickname: flag.host?.nickname, profileImageUrl: flag.host?.profileImageUrl }
                : myParticipant
                  ? { id: myParticipant.id, nickname: myParticipant.nickname, profileImageUrl: myParticipant.profileImageUrl }
                  : undefined
            }
          />
        )}

        {/* 메모리얼 링크 — 종료된 Flag 한정 */}
        {flag.id && isEnded && (
          <div className="bg-white px-4 py-3 border-b">
            <Link
              href={`/flags/${flag.id}/memorial`}
              className="flex items-center justify-between bg-indigo-50 hover:bg-indigo-100 transition-colors rounded-xl px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-indigo-700">Memorial</p>
                <p className="text-xs text-indigo-400 mt-0.5">
                  {memorialCount > 0
                    ? `${memorialCount}개의 memorial이 있습니다. 소감과 회포를 들을 수 있어요`
                    : "기억을 남겨보세요"}
                </p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400 shrink-0">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </Link>
          </div>
        )}
        </div>
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
              onClick={handleLeave}
              className="flex-1 py-2.5 text-sm font-medium border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              참여 취소
            </button>
          )}
          {!isHost && !isParticipating && (
            <button
              disabled={isLoading || isClosed}
              onClick={handleParticipate}
              className="flex-1 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isClosed ? "모집 마감됨" : "참여하기"}
            </button>
          )}
        </div>
      </div>

      {/* 초대 바텀시트 */}
      {inviteModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center"
          onClick={() => setInviteModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-t-2xl px-5 pt-5 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h2 className="text-base font-bold text-gray-900 mb-4">친구 초대</h2>
            {invitableFriends.length === 0 ? (
              <p className="text-sm text-gray-400">초대할 수 있는 친구가 없습니다.</p>
            ) : (
              <div className="flex gap-2">
                <select
                  value={selectedFriendId}
                  onChange={(e) => setSelectedFriendId(e.target.value === "" ? "" : Number(e.target.value))}
                  className="flex-1 text-sm text-gray-900 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-400"
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
                  className="text-sm px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 font-medium shrink-0"
                >
                  {isInviting ? "전송 중..." : "초대"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
