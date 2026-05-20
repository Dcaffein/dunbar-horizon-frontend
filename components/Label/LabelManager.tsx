// components/Label/LabelManager.tsx
"use client";

import { useState } from "react";
import { useLabelManager } from "./useLabelManager";
import type { LabelCreateRequest } from "./types";
import type { FriendshipDetail } from "@/components/SocialGraph/types";

const LABEL_NAME_MAX_LENGTH = 20;

interface LabelManagerProps {
  selectedNodeId: string | null;
  friends: FriendshipDetail[];
  onLabelSelect: (labelId: string | null) => void;
  activeLabelId: string | null;
}

export default function LabelManager({
  selectedNodeId,
  friends,
  onLabelSelect,
  activeLabelId,
}: LabelManagerProps) {
  const { labels, createLabel, addMember } = useLabelManager();

  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [labelNameInput, setLabelNameInput] = useState("");
  const [exposureInput, setExposureInput] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const selectedFriend = selectedNodeId
    ? friends.find((f) => String(f.friendId) === selectedNodeId)
    : null;

  function handleCardClick(labelId: string) {
    onLabelSelect(activeLabelId === labelId ? null : labelId);
  }

  function handleAddMember(labelId: string) {
    if (!selectedNodeId || !selectedFriend) return;
    const memberId = Number(selectedNodeId);
    const nickname = selectedFriend.friendAlias || selectedFriend.friendNickname;
    addMember(labelId, memberId, nickname);
  }

  function handleCreateLabel() {
    setFormError(null);

    const request: LabelCreateRequest = {
      labelName: labelNameInput,
      exposure: exposureInput,
    };

    const error = createLabel(request);

    if (error?.labelName) {
      setFormError(error.labelName);
      return;
    }

    setLabelNameInput("");
    setExposureInput(false);
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
          setExposureInput(false);
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

          <div className="flex items-center justify-between mb-3">
            <label className="text-xs text-gray-600">공개 여부</label>
            <button
              type="button"
              onClick={() => setExposureInput((prev) => !prev)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                exposureInput ? "bg-indigo-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  exposureInput ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          <button
            onClick={handleCreateLabel}
            className="w-full bg-indigo-600 text-white text-sm font-semibold py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            라벨 만들기
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
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-xs text-gray-400">
                    {label.members.length}명
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      label.exposure
                        ? "bg-green-100 text-green-600"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {label.exposure ? "공개" : "비공개"}
                  </span>
                </div>
              </button>

              {/* 인라인 멤버 추가 버튼 */}
              <div className="px-3 pb-2">
                <button
                  onClick={() => handleAddMember(label.id)}
                  disabled={!selectedNodeId}
                  className="w-full text-xs py-1 rounded-md border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {selectedNodeId
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
