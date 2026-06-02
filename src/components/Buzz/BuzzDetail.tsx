"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { BuzzDetailResult } from "@/api/model/buzzDetailResult";
import type { BuzzCommentResult } from "@/api/model/buzzCommentResult";
import {
  addCommentAction,
  updateCommentAction,
  deleteCommentAction,
  deleteBuzzAction,
} from "@/app/actions/buzz";

interface BuzzDetailProps {
  buzz: BuzzDetailResult;
}

function remainingLabel(min?: number): string {
  if (min === undefined || min === null) return "";
  if (min <= 0) return "만료됨";
  if (min < 60) return `${min}분 남음`;
  return `${Math.floor(min / 60)}시간 남음`;
}

function timeAgo(createdAt?: string): string {
  if (!createdAt) return "";
  const diff = Date.now() - new Date(createdAt).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  if (min < 1440) return `${Math.floor(min / 60)}시간 전`;
  return `${Math.floor(min / 1440)}일 전`;
}

export default function BuzzDetail({ buzz }: BuzzDetailProps) {
  const router = useRouter();
  const [comments, setComments] = useState<BuzzCommentResult[]>(buzz.comments ?? []);
  const [commentText, setCommentText] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleAddComment() {
    if (!commentText.trim() || !buzz.buzzId) return;
    setIsSubmitting(true);
    setActionError(null);
    const result = await addCommentAction(buzz.buzzId, { text: commentText.trim(), isPublic });
    setIsSubmitting(false);
    if (result.success && result.data) {
      setComments((prev) => [...prev, result.data!]);
      setCommentText("");
    } else {
      setActionError(result.message ?? null);
    }
  }

  async function handleUpdateComment(commentId: string) {
    if (!buzz.buzzId || !editText.trim()) return;
    const result = await updateCommentAction(buzz.buzzId, commentId, { text: editText.trim(), isPublic });
    if (result.success && result.data) {
      setComments((prev) => prev.map((c) => c.commentId === commentId ? result.data! : c));
      setEditingId(null);
    } else {
      setActionError(result.message ?? null);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!buzz.buzzId) return;
    const result = await deleteCommentAction(buzz.buzzId, commentId);
    if (result.success) {
      setComments((prev) => prev.filter((c) => c.commentId !== commentId));
    } else {
      setActionError(result.message ?? null);
    }
  }

  async function handleDeleteBuzz() {
    if (!buzz.buzzId) return;
    const result = await deleteBuzzAction(buzz.buzzId);
    if (result.success) router.push("/buzzes");
    else setActionError(result.message ?? null);
  }

  const isMyBuzz = buzz.isCreator ?? false;
  const rem = remainingLabel(buzz.remainingMinutes);
  const urgent = (buzz.remainingMinutes ?? 999) < 10;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden shrink-0">
              {buzz.author?.profileImageUrl ? (
                <img src={buzz.author.profileImageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-orange-700 font-bold text-xs">{buzz.author?.nickname?.charAt(0) ?? "?"}</span>
              )}
            </div>
            <span className="font-semibold text-gray-800 text-sm">{buzz.author?.nickname}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium ${urgent ? "text-red-500" : "text-gray-400"}`}>{rem}</span>
          {isMyBuzz && (
            <button onClick={handleDeleteBuzz} className="text-xs text-red-400 hover:text-red-600">삭제</button>
          )}
        </div>
      </header>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white px-4 py-5 border-b">
          {buzz.text && <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{buzz.text}</p>}
          {(buzz.imageUrls?.length ?? 0) > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {buzz.imageUrls!.map((url, i) => (
                <img key={i} src={url} alt="" className="rounded-lg w-full object-cover aspect-square" />
              ))}
            </div>
          )}
        </div>

        {/* 댓글 목록 */}
        <div className="px-4 py-3 space-y-3">
          <p className="text-xs font-bold text-gray-500">댓글 {comments.length}개</p>
          {comments.map((c) => {
            const isMine = c.isMine ?? false;
            return (
              <div key={c.commentId} className="bg-white rounded-xl p-3 border border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-700">{c.author?.nickname}</span>
                  <span className="text-xs text-gray-400">{timeAgo(c.createdAt)}</span>
                </div>
                {editingId === c.commentId ? (
                  <div className="flex gap-2 mt-1">
                    <input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleUpdateComment(c.commentId!)}
                      className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-orange-400"
                    />
                    <button onClick={() => handleUpdateComment(c.commentId!)} className="text-xs text-orange-600 font-medium">저장</button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-gray-400">취소</button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-700">{c.text}</p>
                )}
                {isMine && editingId !== c.commentId && (
                  <div className="flex gap-2 mt-1.5">
                    <button onClick={() => { setEditingId(c.commentId!); setEditText(c.text ?? ""); }} className="text-xs text-gray-400 hover:text-gray-600">수정</button>
                    <button onClick={() => handleDeleteComment(c.commentId!)} className="text-xs text-red-400 hover:text-red-600">삭제</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 댓글 입력 */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 shrink-0">
        {actionError && <p className="text-xs text-red-500 mb-2">{actionError}</p>}
        <div className="flex items-center gap-2 mb-2">
          <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="accent-orange-500"
            />
            공개
          </label>
        </div>
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="댓글을 입력하세요..."
            rows={2}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-orange-400"
          />
          <button
            onClick={handleAddComment}
            disabled={isSubmitting || !commentText.trim()}
            className="text-sm px-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 font-medium shrink-0"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
