// components/Label/LabelManager.tsx
"use client";

import { useState } from "react";
import { useLabelManager } from "./useLabelManager";
import type { LabelCreateRequest } from "./types";
import type { FriendshipDetail } from "@/components/socialGraph/types";

const LABEL_NAME_MAX_LENGTH = 20;

interface LabelManagerProps {
  selectedNodeId: string | null;
  friends: FriendshipDetail[];
}

export default function LabelManager({
  selectedNodeId,
  friends,
}: LabelManagerProps) {
  const { labels, selectedLabelId, createLabel, addMember, selectLabel } =
    useLabelManager();

  const [labelNameInput, setLabelNameInput] = useState("");
  const [exposureInput, setExposureInput] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedFriend = selectedNodeId
    ? friends.find((f) => String(f.friendId) === selectedNodeId)
    : null;

  const selectedFriendDisplayName = selectedFriend
    ? selectedFriend.friendAlias || selectedFriend.friendNickname
    : null;

  function handleCreateLabel() {
    setFormError(null);
    setSuccessMessage(null);

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
    setSuccessMessage("라벨이 생성되었습니다.");
    setTimeout(() => setSuccessMessage(null), 2000);
  }

  function handleAddMember() {
    if (!selectedLabelId || !selectedNodeId || !selectedFriend) return;

    const memberId = Number(selectedNodeId);
    const nickname = selectedFriend.friendAlias || selectedFriend.friendNickname;
    addMember(selectedLabelId, memberId, nickname);
    setSuccessMessage(
      `${selectedFriendDisplayName}을(를) 라벨에 추가했습니다.`,
    );
    setTimeout(() => setSuccessMessage(null), 2000);
  }

  const canAddMember = selectedLabelId !== null && selectedNodeId !== null;

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* 라벨 생성 폼 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <p className="text-xs font-bold text-gray-500 mb-3">새 라벨 만들기</p>

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

        {successMessage && (
          <p className="text-xs text-indigo-600 text-center mt-2">
            {successMessage}
          </p>
        )}
      </div>

      {/* 라벨 목록 */}
      <div>
        <p className="text-xs font-bold text-gray-500 mb-2 px-1">
          내 라벨 ({labels.length})
        </p>
        <div className="flex flex-col gap-2">
          {labels.map((label) => (
            <button
              key={label.id}
              onClick={() =>
                selectLabel(label.id === selectedLabelId ? null : label.id)
              }
              className={`flex items-center justify-between w-full px-3 py-2 rounded-lg border text-left transition ${
                selectedLabelId === label.id
                  ? "bg-indigo-50 border-indigo-400 text-indigo-700"
                  : "bg-white border-gray-200 text-gray-700 hover:border-indigo-300"
              }`}
            >
              <span className="text-sm font-medium truncate">
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
          ))}
        </div>
      </div>

      {/* 멤버 추가 섹션 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <p className="text-xs font-bold text-gray-500 mb-3">
          선택한 친구를 라벨에 추가
        </p>

        <div className="text-sm text-gray-600 mb-3">
          {selectedFriendDisplayName ? (
            <span>
              선택된 친구:{" "}
              <span className="font-bold text-indigo-600">
                {selectedFriendDisplayName}
              </span>
            </span>
          ) : (
            <span className="text-gray-400">그래프에서 친구를 클릭하세요</span>
          )}
        </div>

        {!selectedLabelId && (
          <p className="text-xs text-gray-400 mb-2">위에서 라벨을 선택하세요</p>
        )}

        <button
          onClick={handleAddMember}
          disabled={!canAddMember}
          className="w-full bg-indigo-600 text-white text-sm font-semibold py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          이 친구를 라벨에 추가하기
        </button>
      </div>
    </div>
  );
}
