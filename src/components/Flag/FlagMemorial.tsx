"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MemorialResult } from "@/api/model/memorialResult";
import {
  createMemorialAction,
  updateMemorialAction,
  deleteMemorialAction,
} from "@/app/actions/flag";

interface FlagMemorialProps {
  flagId: number;
  initialMemorials: MemorialResult[];
  myUserId?: number;
  isParticipant: boolean;
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
  isParticipant,
}: FlagMemorialProps) {
  const router = useRouter();
  const [memorials, setMemorials] = useState<MemorialResult[]>(initialMemorials);
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!text.trim()) return;
    setIsSubmitting(true);
    setError(null);
    const result = await createMemorialAction(flagId, text.trim());
    setIsSubmitting(false);
    if (result.success) {
      setText("");
      router.refresh();
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
    <div className="bg-white px-4 py-4 border-b">
      <p className="text-xs font-bold text-gray-500 mb-3">메모리얼 남기기</p>

      {memorials.length === 0 ? (
        <p className="text-xs text-gray-400 mb-3">아직 남겨진 기억이 없습니다.</p>
      ) : (
        <ul className="space-y-3 mb-3">
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
                      className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:border-indigo-400"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdate(m.id!)}
                        className="text-xs text-indigo-600 font-medium"
                      >
                        저장
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs text-gray-400"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap mt-1">{m.content}</p>
                )}

                {isMine && editingId !== m.id && (
                  <div className="flex gap-2 mt-1.5">
                    <button
                      onClick={() => { setEditingId(m.id!); setEditText(m.content ?? ""); }}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(m.id!)}
                      className="text-xs text-red-400 hover:text-red-600"
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

      {isParticipant && (
        <div className="space-y-1.5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="이 Flag에서의 기억을 남겨보세요"
            maxLength={1000}
            rows={2}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-indigo-400"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            onClick={handleCreate}
            disabled={isSubmitting || !text.trim()}
            className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
          >
            {isSubmitting ? "저장 중..." : "기억 남기기"}
          </button>
        </div>
      )}
    </div>
  );
}
