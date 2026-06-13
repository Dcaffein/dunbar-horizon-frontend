"use client";

import { useState } from "react";
import type { MemorialResult } from "@/api/model/memorialResult";
import {
  getMemorialsAction,
  createMemorialAction,
  updateMemorialAction,
  deleteMemorialAction,
} from "@/app/actions/flag";

interface FlagMemorialProps {
  flagId: number;
  initialMemorials: MemorialResult[];
  myUserId?: number;
  myNickname?: string;
  myProfileImageUrl?: string;
  isParticipant: boolean;
  locked?: boolean;
}

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  if (min < 1440) return `${Math.floor(min / 60)}시간 전`;
  return `${Math.floor(min / 1440)}일 전`;
}

export default function FlagMemorial({
  flagId,
  initialMemorials,
  myUserId,
  myNickname,
  myProfileImageUrl,
  isParticipant,
  locked = false,
}: FlagMemorialProps) {
  const [memorials, setMemorials] = useState<MemorialResult[]>(initialMemorials);
  const [isLocked, setIsLocked] = useState(locked);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!text.trim()) return;
    setIsSubmitting(true);
    setError(null);
    const content = text.trim();
    const result = await createMemorialAction(flagId, content);
    setIsSubmitting(false);
    if (result.success) {
      if (isLocked) {
        // 첫 메모리얼 작성 → 잠금 해제 후 전체 목록 재조회
        const fetched = await getMemorialsAction(flagId);
        setMemorials(
          fetched.success && fetched.data.length > 0
            ? fetched.data
            : [{ id: result.data, writerId: myUserId, nickname: myNickname, profileImageUrl: myProfileImageUrl, content, createdAt: new Date().toISOString() }]
        );
        setIsLocked(false);
      } else {
        setMemorials((prev) => [
          ...prev,
          { id: result.data, writerId: myUserId, nickname: myNickname, profileImageUrl: myProfileImageUrl, content, createdAt: new Date().toISOString() },
        ]);
      }
      setText("");
      setIsModalOpen(false);
    } else {
      setError(result.message ?? "작성에 실패했습니다.");
    }
  }

  async function handleUpdate(id: number) {
    if (!editText.trim()) return;
    const result = await updateMemorialAction(id, editText.trim());
    if (result.success) {
      setMemorials((prev) =>
        prev.map((m) => m.id === id ? { ...m, content: editText.trim() } : m)
      );
      setEditingId(null);
    } else {
      setError(result.message ?? "수정에 실패했습니다.");
    }
  }

  async function handleDelete(id: number) {
    const result = await deleteMemorialAction(id);
    if (result.success) {
      setMemorials((prev) => prev.filter((m) => m.id !== id));
    } else {
      setError(result.message ?? "삭제에 실패했습니다.");
    }
  }

  return (
    <>
      <div className="bg-white px-4 py-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-indigo-500">
            Memorial {!isLocked && memorials.length > 0 ? `${memorials.length}개` : ""}
          </p>
          {isParticipant && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-xs px-3 py-1 bg-indigo-600 text-white rounded-full font-medium hover:bg-indigo-700 transition-colors"
            >
              작성하기
            </button>
          )}
        </div>

        {isLocked ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <span className="text-3xl">🔒</span>
            <p className="text-sm text-gray-500 text-center leading-relaxed">
              메모리얼을 작성하면<br />다른 참여자가 남긴 메모리얼을 볼 수 있어요.
            </p>
            {!isParticipant && (
              <p className="text-xs text-gray-400">참여자만 메모리얼을 남길 수 있습니다.</p>
            )}
          </div>
        ) : memorials.length === 0 ? (
          <p className="text-xs text-gray-400">아직 남겨진 기억이 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {memorials.map((m) => {
              const isMine = !!myUserId && m.writerId === myUserId;
              return (
                <li key={m.id} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
                        {m.profileImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.profileImageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-indigo-700 font-bold text-xs">{m.nickname?.charAt(0) ?? "?"}</span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-gray-700">{m.nickname}</span>
                    </div>
                    <span className="text-xs text-gray-400">{timeAgo(m.createdAt)}</span>
                  </div>

                  {editingId === m.id ? (
                    <div className="mt-1 space-y-1.5">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        maxLength={1000}
                        rows={2}
                        className="w-full text-xs text-gray-900 border border-gray-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:border-indigo-400"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdate(m.id!)} className="text-xs text-indigo-600 font-medium">저장</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-gray-500">취소</button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap mt-1">{m.content}</p>
                  )}

                  {isMine && editingId !== m.id && (
                    <div className="flex gap-2 mt-1.5">
                      <button
                        onClick={() => { setEditingId(m.id!); setEditText(m.content ?? ""); }}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(m.id!)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 메모리얼 작성 바텀시트 */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-t-2xl px-5 pt-5 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h2 className="text-base font-bold text-gray-900 mb-1">Memorial 작성하기</h2>
            <p className="text-xs text-gray-400 mb-4">이 Flag에서의 기억을 자유롭게 남겨보세요.</p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="함께한 순간들을 기록해보세요"
              maxLength={1000}
              rows={5}
              autoFocus
              className="w-full text-sm text-gray-900 border border-gray-200 rounded-xl px-3 py-3 resize-none focus:outline-none focus:border-indigo-400 leading-relaxed"
            />
            <div className="flex justify-end mt-1 mb-3">
              <span className="text-xs text-gray-300">{text.length}/1000</span>
            </div>
            {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => { setIsModalOpen(false); setError(null); }}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={isSubmitting || !text.trim()}
                className="flex-1 py-3 bg-indigo-600 rounded-xl text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
