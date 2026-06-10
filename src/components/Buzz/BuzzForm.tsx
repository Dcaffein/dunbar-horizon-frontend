"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FriendshipDetail } from "@/components/socialGraph/types";
import type { LabelResult } from "@/api/model/labelResult";
import { createBuzzAction } from "@/app/actions/buzz";
import { uploadImages } from "@/lib/uploadImages";

type RecipientType = "ANCHOR" | "LABEL" | "MANUAL";

interface BuzzFormProps {
  friends: FriendshipDetail[];
  labels: LabelResult[];
}

function expansionLabel(v: number): string {
  if (v <= 0.3) return "좁게";
  if (v <= 0.6) return "보통";
  return "넓게";
}

export default function BuzzForm({ friends, labels }: BuzzFormProps) {
  const router = useRouter();
  const [recipientType, setRecipientType] = useState<RecipientType>("ANCHOR");

  // ANCHOR
  const [anchorFriendId, setAnchorFriendId] = useState<number | null>(
    friends[0]?.friendId ?? null,
  );
  const [expansionValue, setExpansionValue] = useState(0.5);

  // LABEL
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);

  // MANUAL
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);

  // 내용
  const [text, setText] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleLabel(id: string) {
    setSelectedLabelIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleMember(id: number) {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSubmit() {
    if (!text.trim()) { setError("내용을 입력해주세요."); return; }
    if (recipientType === "ANCHOR" && !anchorFriendId) { setError("anchor 친구를 선택해주세요."); return; }
    if (recipientType === "LABEL" && selectedLabelIds.length === 0) { setError("라벨을 하나 이상 선택해주세요."); return; }
    if (recipientType === "MANUAL" && selectedMemberIds.length === 0) { setError("수신자를 한 명 이상 선택해주세요."); return; }

    setIsSubmitting(true);
    setError(null);

    try {
      const imageKeys = imageFiles.length > 0 ? await uploadImages(imageFiles) : [];

      const recipient =
        recipientType === "ANCHOR"
          ? { type: "ANCHOR" as const, anchorFriendId: anchorFriendId!, expansionValue }
          : recipientType === "LABEL"
          ? { type: "LABEL" as const, labelIds: selectedLabelIds }
          : { type: "MANUAL" as const, memberIds: selectedMemberIds };

      const result = await createBuzzAction({ text: text.trim(), recipient, imageKeys });
      if (result.success) {
        router.push("/buzzes");
      } else {
        setError(result.message ?? "Buzz 작성에 실패했습니다.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-4 shrink-0">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">Buzz 작성</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
          {/* 수신자 타입 */}
          <div>
            <p className="text-xs font-bold text-gray-500 mb-2">수신자 지정</p>
            <div className="flex gap-1 bg-gray-200 p-1 rounded-lg">
              {(["ANCHOR", "LABEL", "MANUAL"] as RecipientType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setRecipientType(t)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${
                    recipientType === t ? "bg-white shadow text-orange-600" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t === "ANCHOR" ? "Anchor" : t === "LABEL" ? "라벨" : "직접 선택"}
                </button>
              ))}
            </div>
          </div>

          {/* ANCHOR 옵션 */}
          {recipientType === "ANCHOR" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block">Anchor 친구</label>
                <select
                  value={anchorFriendId ?? ""}
                  onChange={(e) => setAnchorFriendId(Number(e.target.value))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-orange-400"
                >
                  {friends.map((f) => (
                    <option key={f.friendId} value={f.friendId}>
                      {f.friendAlias || f.friendNickname}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block">
                  수신 범위 — {expansionLabel(expansionValue)}
                </label>
                <input
                  type="range"
                  min={0.1}
                  max={1.0}
                  step={0.1}
                  value={expansionValue}
                  onChange={(e) => setExpansionValue(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>좁게</span>
                  <span>넓게</span>
                </div>
              </div>
            </div>
          )}

          {/* LABEL 옵션 */}
          {recipientType === "LABEL" && (
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">라벨 선택</label>
              {labels.length === 0 ? (
                <p className="text-xs text-gray-400">라벨이 없습니다.</p>
              ) : (
                <div className="space-y-1.5">
                  {labels.map((l) => (
                    <label key={l.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedLabelIds.includes(l.id!)}
                        onChange={() => toggleLabel(l.id!)}
                        className="accent-orange-500"
                      />
                      <span className="text-sm text-gray-700">{l.labelName}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MANUAL 옵션 */}
          {recipientType === "MANUAL" && (
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">수신자 선택</label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {friends.map((f) => (
                  <label key={f.friendId} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMemberIds.includes(f.friendId)}
                      onChange={() => toggleMember(f.friendId)}
                      className="accent-orange-500"
                    />
                    <span className="text-sm text-gray-700">{f.friendAlias || f.friendNickname}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 내용 입력 */}
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">내용</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="내용을 입력하세요..."
              rows={5}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-orange-400"
            />
          </div>

          {/* 이미지 첨부 */}
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">이미지 첨부 (선택)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setImageFiles(Array.from(e.target.files ?? []))}
              className="text-xs text-gray-500"
            />
            {imageFiles.length > 0 && (
              <p className="text-xs text-gray-400 mt-1">{imageFiles.length}장 선택됨</p>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </div>

      <div className="bg-white border-t border-gray-100 px-4 py-4 shrink-0">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full max-w-lg mx-auto block py-3 bg-orange-500 text-white text-sm font-bold rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? "전송 중..." : "Buzz 보내기"}
        </button>
      </div>
    </div>
  );
}
