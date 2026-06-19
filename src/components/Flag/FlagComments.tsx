"use client";

import { useState } from "react";
import type { CommentResult } from "@/api/model/commentResult";
import type { WriterInfo } from "@/api/model/writerInfo";
import {
  createCommentAction,
  createReplyAction,
  updateCommentAction,
  deleteCommentAction,
} from "@/app/actions/flag";

// CommentResult 타입에 replies 필드가 런타임에 존재하지만 OpenAPI 스펙 순환참조로 누락됨
type CommentTree = CommentResult & { replies?: CommentTree[] };

interface FlagCommentsProps {
  flagId: number;
  initialComments: CommentResult[];
  myWriterInfo?: WriterInfo;
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

interface CommentItemProps {
  comment: CommentTree;
  depth: number;
  onReply: (parentId: number) => void;
  onEdit: (commentId: number, content: string) => void;
  onDelete: (commentId: number) => void;
  editingId: number | null;
  editText: string;
  onEditTextChange: (text: string) => void;
  onEditSubmit: (commentId: number) => void;
  onEditCancel: () => void;
}

function CommentItem({
  comment, depth, onReply, onEdit, onDelete,
  editingId, editText, onEditTextChange, onEditSubmit, onEditCancel,
}: CommentItemProps) {
  return (
    <div className={depth > 0 ? "ml-6 border-l-2 border-gray-100 pl-3" : ""}>
      <div className="py-2">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
              {comment.writerInfo?.profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={comment.writerInfo.profileImageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-indigo-700 font-bold text-xs">
                  {comment.writerInfo?.nickname?.charAt(0) ?? "?"}
                </span>
              )}
            </div>
            <span className="text-xs font-semibold text-gray-700">{comment.writerInfo?.nickname}</span>
            {comment.isPrivate && comment.isMine && (
              <span className="text-xs text-gray-400 bg-gray-100 px-1 rounded">🔒</span>
            )}
          </div>
          <span className="text-xs text-gray-400">{timeAgo(comment.createdAt)}</span>
        </div>

        {editingId === comment.id ? (
          <div className="mt-1 space-y-1">
            <input
              value={editText}
              onChange={(e) => onEditTextChange(e.target.value)}
              className="w-full text-xs text-gray-900 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-400"
            />
            <div className="flex gap-2">
              <button onClick={() => onEditSubmit(comment.id!)} className="text-xs text-indigo-600 font-medium">저장</button>
              <button onClick={onEditCancel} className="text-xs text-gray-400">취소</button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-700 leading-relaxed mt-0.5">{comment.content}</p>
        )}

        <div className="flex gap-3 mt-1">
          {depth === 0 && (
            <button
              onClick={() => onReply(comment.id!)}
              className="text-xs text-gray-500 hover:text-indigo-500"
            >
              답글
            </button>
          )}
          {comment.isMine && editingId !== comment.id && (
            <>
              <button
                onClick={() => onEdit(comment.id!, comment.content ?? "")}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                수정
              </button>
              <button
                onClick={() => onDelete(comment.id!)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                삭제
              </button>
            </>
          )}
        </div>
      </div>

      {comment.replies?.map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          depth={depth + 1}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          editingId={editingId}
          editText={editText}
          onEditTextChange={onEditTextChange}
          onEditSubmit={onEditSubmit}
          onEditCancel={onEditCancel}
        />
      ))}
    </div>
  );
}

export default function FlagComments({ flagId, initialComments, myWriterInfo }: FlagCommentsProps) {
  const [comments, setComments] = useState<CommentTree[]>(initialComments as CommentTree[]);
  const [text, setText] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyPrivate, setReplyPrivate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!text.trim()) return;
    setIsSubmitting(true);
    setError(null);
    const content = text.trim();
    const result = await createCommentAction(flagId, content, isPrivate || undefined);
    setIsSubmitting(false);
    if (result.success) {
      setComments((prev) => [
        ...prev,
        { id: result.data, content, isPrivate, isMine: true, createdAt: new Date().toISOString(), writerInfo: myWriterInfo },
      ]);
      setText("");
      setIsPrivate(false);
    } else {
      setError(result.message ?? "댓글 작성에 실패했습니다.");
    }
  }

  async function handleReply(parentId: number) {
    if (!replyText.trim()) return;
    setIsSubmitting(true);
    setError(null);
    const content = replyText.trim();
    const result = await createReplyAction(parentId, content, replyPrivate || undefined);
    setIsSubmitting(false);
    if (result.success) {
      const newReply: CommentTree = {
        id: result.data,
        content,
        isPrivate: replyPrivate,
        isMine: true,
        createdAt: new Date().toISOString(),
        writerInfo: myWriterInfo,
      };
      setComments((prev) =>
        prev.map((c) => c.id === parentId ? { ...c, replies: [...(c.replies ?? []), newReply] } : c)
      );
      setReplyText("");
      setReplyPrivate(false);
      setReplyingToId(null);
    } else {
      setError(result.message ?? "대댓글 작성에 실패했습니다.");
    }
  }

  async function handleUpdate(commentId: number) {
    if (!editText.trim()) return;
    const result = await updateCommentAction(commentId, editText.trim());
    if (result.success) {
      setComments((prev) => updateInTree(prev, commentId, { content: editText.trim() }));
      setEditingId(null);
    } else {
      setError(result.message ?? "댓글 수정에 실패했습니다.");
    }
  }

  async function handleDelete(commentId: number) {
    const result = await deleteCommentAction(commentId);
    if (result.success) {
      setComments((prev) => removeFromTree(prev, commentId));
    } else {
      setError(result.message ?? "댓글 삭제에 실패했습니다.");
    }
  }

  function updateInTree(list: CommentTree[], id: number, patch: Partial<CommentTree>): CommentTree[] {
    return list.map((c) =>
      c.id === id
        ? { ...c, ...patch }
        : { ...c, replies: c.replies ? updateInTree(c.replies, id, patch) : undefined },
    );
  }

  function removeFromTree(list: CommentTree[], id: number): CommentTree[] {
    return list
      .filter((c) => c.id !== id)
      .map((c) => ({ ...c, replies: c.replies ? removeFromTree(c.replies, id) : undefined }));
  }

  const totalCount = comments.reduce((acc, c) => acc + 1 + (c.replies?.length ?? 0), 0);

  return (
    <div className="bg-white px-4 py-4 border-b">
      <p className="text-xs font-bold text-gray-500 mb-3">댓글 {totalCount}개</p>

      {comments.length === 0 ? (
        <p className="text-xs text-gray-400 mb-3">아직 댓글이 없습니다.</p>
      ) : (
        <div className="divide-y divide-gray-50 mb-3">
          {comments.map((comment) => (
            <div key={comment.id}>
              <CommentItem
                comment={comment}
                depth={0}
                onReply={(id) => { setReplyingToId(id); setReplyText(""); }}
                onEdit={(id, content) => { setEditingId(id); setEditText(content); }}
                onDelete={handleDelete}
                editingId={editingId}
                editText={editText}
                onEditTextChange={setEditText}
                onEditSubmit={handleUpdate}
                onEditCancel={() => setEditingId(null)}
              />
              {replyingToId === comment.id && (
                <div className="ml-6 mb-2 space-y-1">
                  <div className="flex gap-2 items-center">
                    <input
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="대댓글을 입력하세요"
                      className="flex-1 text-xs text-gray-900 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-400"
                    />
                    <button
                      onClick={() => setReplyPrivate((v) => !v)}
                      className={`text-xs px-2 py-1.5 rounded border transition ${
                        replyPrivate
                          ? "border-indigo-300 text-indigo-600 bg-indigo-50"
                          : "border-gray-200 text-gray-400"
                      }`}
                    >
                      {replyPrivate ? "🔒" : "🔓"}
                    </button>
                    <button
                      onClick={() => handleReply(comment.id!)}
                      disabled={isSubmitting || !replyText.trim()}
                      className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg disabled:opacity-50"
                    >
                      전송
                    </button>
                    <button
                      onClick={() => setReplyingToId(null)}
                      className="text-xs text-gray-400"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      <div className="flex gap-2 items-center">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleCreate()}
          placeholder="댓글을 입력하세요"
          className="flex-1 text-sm text-gray-900 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
        />
        <button
          onClick={() => setIsPrivate((v) => !v)}
          className={`text-sm px-3 py-2 rounded-lg border transition ${
            isPrivate
              ? "border-indigo-300 text-indigo-600 bg-indigo-50"
              : "border-gray-200 text-gray-400 hover:border-gray-300"
          }`}
        >
          {isPrivate ? "🔒" : "🔓"}
        </button>
        <button
          onClick={handleCreate}
          disabled={isSubmitting || !text.trim()}
          className="text-sm px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium shrink-0"
        >
          전송
        </button>
      </div>
    </div>
  );
}
