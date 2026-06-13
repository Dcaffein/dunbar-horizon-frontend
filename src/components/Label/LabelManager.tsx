// components/Label/LabelManager.tsx
"use client";

import { useState } from "react";
import { useLabelManager } from "./useLabelManager";
import type { Label, LabelCreateRequest } from "./types";
import type { FriendshipDetail } from "@/components/socialGraph/types";

const LABEL_NAME_MAX_LENGTH = 20;

interface LabelManagerProps {
  initialLabels: Label[];
  selectedNodeId: string | null;
  friends: FriendshipDetail[];
  onLabelSelect: (labelId: string | null) => void;
  activeLabelId: string | null;
}

export default function LabelManager({
  initialLabels,
  selectedNodeId,
  friends,
  onLabelSelect,
  activeLabelId,
}: LabelManagerProps) {
  const { labels, createLabel, addMember } = useLabelManager(initialLabels);

  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [labelNameInput, setLabelNameInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [addingMemberLabelId, setAddingMemberLabelId] = useState<string | null>(null);

  const selectedFriend = selectedNodeId
    ? friends.find((f) => String(f.friendId) === selectedNodeId)
    : null;

  function handleCardClick(labelId: string) {
    onLabelSelect(activeLabelId === labelId ? null : labelId);
  }

  async function handleAddMember(labelId: string) {
    if (!selectedNodeId || !selectedFriend) return;
    const memberId = Number(selectedNodeId);
    const nickname = selectedFriend.friendAlias || selectedFriend.friendNickname;
    setAddingMemberLabelId(labelId);
    await addMember(labelId, memberId, nickname);
    setAddingMemberLabelId(null);
  }

  async function handleCreateLabel() {
    setFormError(null);

    const request: LabelCreateRequest = {
      labelName: labelNameInput,
    };

    setIsCreating(true);
    const error = await createLabel(request);
    setIsCreating(false);

    if (error?.labelName) {
      setFormError(error.labelName);
      return;
    }

    setLabelNameInput("");
    setIsCreateFormOpen(false);
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* 새 라벨 만들기 토글 버튼 */}
      <button
        onClick={() => {
          setIsCreateFormOpen((prev) => !prev);
          setFormError(null);
          setLabelNameInput("");
        }}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-indigo-300 text-indigo-600 text-sm font-semibold hover:bg-indigo-50 transition"
      >
        {isCreateFormOpen ? "닫기" : "+ 새 라벨 만들기"}
      </button>

      {/* 생성 폼 (토글) */}
      {isCreateFormOpen && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-gray-600">라벨 이름</label>
              <span
                className={`text-xs ${
                  labelNameInput.length > LABEL_NAME_MAX_LENGTH
                    ? "text-red-500 font-bold"
                    : "text-gray-400"
                }`}
              >
                {labelNameInput.length}/{LABEL_NAME_MAX_LENGTH}
              </span>
            </div>
            <input
              type="text"
              value={labelNameInput}
              onChange={(e) => {
                setLabelNameInput(e.target.value);
                setFormError(null);
              }}
              placeholder="라벨 이름 입력"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            {formError && (
              <p className="text-xs text-red-500 mt-1">{formError}</p>
            )}
          </div>

          <button
            onClick={handleCreateLabel}
            disabled={isCreating}
            className="w-full bg-indigo-600 text-white text-sm font-semibold py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {isCreating ? "만드는 중..." : "라벨 만들기"}
          </button>
        </div>
      )}

      {/* 라벨 목록 */}
      <div>
        <p className="text-xs font-bold text-gray-500 mb-2 px-1">
          내 라벨 ({labels.length})
        </p>
        <div className="flex flex-col gap-2">
          {labels.map((label) => (
            <div
              key={label.id}
              className={`rounded-lg border transition ${
                activeLabelId === label.id
                  ? "bg-indigo-50 border-indigo-400"
                  : "bg-white border-gray-200"
              }`}
            >
              {/* 카드 전체 클릭 → 그래프 교체 */}
              <button
                onClick={() => handleCardClick(label.id)}
                className="flex items-center justify-between w-full px-3 py-2 text-left"
              >
                <span
                  className={`text-sm font-medium truncate ${
                    activeLabelId === label.id
                      ? "text-indigo-700"
                      : "text-gray-700"
                  }`}
                >
                  {label.labelName}
                </span>
                <span className="text-xs text-gray-400 shrink-0 ml-2">
                  {label.members.length}명
                </span>
              </button>

              {/* 인라인 멤버 추가 버튼 */}
              <div className="px-3 pb-2">
                <button
                  onClick={() => handleAddMember(label.id)}
                  disabled={!selectedNodeId || addingMemberLabelId === label.id}
                  className="w-full text-xs py-1 rounded-md border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {addingMemberLabelId === label.id
                    ? "추가 중..."
                    : selectedNodeId
                    ? `+ ${selectedFriend?.friendAlias || selectedFriend?.friendNickname} 멤버 추가`
                    : "+ 멤버 추가 (노드 선택 필요)"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
