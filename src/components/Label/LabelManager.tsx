// components/Label/LabelManager.tsx
"use client";

import { useState } from "react";
import { useLabelManager } from "./useLabelManager";
import type { Label, LabelCreateRequest } from "./types";
import type { FriendshipDetail } from "@/components/socialGraph/types";

const LABEL_NAME_MAX_LENGTH = 20;

interface LabelManagerProps {
  initialLabels: Label[];
  friends: FriendshipDetail[];
  onLabelSelect: (labelId: string | null, memberIds: number[]) => void;
  activeLabelId: string | null;
  onMemberAdd?: (friendId: number) => void;
  onMemberRemove?: (memberId: number) => void;
}

export default function LabelManager({
  initialLabels,
  friends,
  onLabelSelect,
  activeLabelId,
  onMemberAdd,
  onMemberRemove,
}: LabelManagerProps) {
  const { labels, createLabel, addMember, removeMember } = useLabelManager(initialLabels);

  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [labelNameInput, setLabelNameInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [searchOpenLabelId, setSearchOpenLabelId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [addingMemberLabelId, setAddingMemberLabelId] = useState<string | null>(null);

  function handleCardClick(labelId: string) {
    const isDeselecting = activeLabelId === labelId;
    if (isDeselecting) {
      onLabelSelect(null, []);
    } else {
      const memberIds = labels.find((l) => l.id === labelId)?.members.map((m) => m.id) ?? [];
      onLabelSelect(labelId, memberIds);
    }
  }

  function handleToggleSearch(labelId: string) {
    if (searchOpenLabelId === labelId) {
      setSearchOpenLabelId(null);
      setSearchQuery("");
    } else {
      setSearchOpenLabelId(labelId);
      setSearchQuery("");
    }
  }

  async function handleAddMemberFromSearch(labelId: string, friend: FriendshipDetail) {
    setAddingMemberLabelId(`${labelId}-${friend.friendId}`);
    const nickname = friend.friendAlias || friend.friendNickname;

    // 그래프와 API를 동시에 실행 (낙관적 업데이트)
    onMemberAdd?.(friend.friendId);
    const ok = await addMember(labelId, friend.friendId, nickname);
    setAddingMemberLabelId(null);

    if (!ok) onMemberRemove?.(friend.friendId); // 실패 시 롤백
  }

  async function handleRemoveMember(labelId: string, memberId: number) {
    // 그래프와 API를 동시에 실행 (낙관적 업데이트)
    onMemberRemove?.(memberId);
    const ok = await removeMember(labelId, memberId);

    if (!ok) onMemberAdd?.(memberId); // 실패 시 롤백 (엣지까지 복원은 어려우므로 노드만)
  }

  async function handleCreateLabel() {
    setFormError(null);
    const request: LabelCreateRequest = { labelName: labelNameInput };
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
    <div className="flex flex-col gap-3 p-4 bg-white min-h-full">
      {/* 새 라벨 만들기 */}
      <button
        onClick={() => {
          setIsCreateFormOpen((prev) => !prev);
          setFormError(null);
          setLabelNameInput("");
        }}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-indigo-400 text-indigo-600 text-sm font-semibold hover:bg-indigo-50 transition"
      >
        {isCreateFormOpen ? "닫기" : "+ 새 라벨 만들기"}
      </button>

      {isCreateFormOpen && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-gray-600">라벨 이름</label>
              <span className={`text-xs ${labelNameInput.length > LABEL_NAME_MAX_LENGTH ? "text-red-500 font-bold" : "text-gray-400"}`}>
                {labelNameInput.length}/{LABEL_NAME_MAX_LENGTH}
              </span>
            </div>
            <input
              type="text"
              value={labelNameInput}
              onChange={(e) => { setLabelNameInput(e.target.value); setFormError(null); }}
              placeholder="라벨 이름 입력"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            {formError && <p className="text-xs text-red-500 mt-1">{formError}</p>}
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
        <p className="text-xs font-bold text-gray-600 mb-2 px-1">내 라벨 ({labels.length})</p>
        <div className="flex flex-col gap-2">
          {labels.map((label) => {
            const nonMembers = friends.filter(
              (f) => !label.members.some((m) => m.id === f.friendId)
            );
            const filteredFriends = searchQuery.trim()
              ? nonMembers.filter((f) => {
                  const q = searchQuery.toLowerCase();
                  return (
                    f.friendNickname.toLowerCase().includes(q) ||
                    (f.friendAlias && f.friendAlias.toLowerCase().includes(q))
                  );
                })
              : nonMembers;

            return (
              <div
                key={label.id}
                className={`rounded-lg border transition ${
                  activeLabelId === label.id
                    ? "bg-indigo-50 border-indigo-500 shadow-sm"
                    : "bg-white border-gray-300 hover:border-gray-400"
                }`}
              >
                {/* 카드 헤더 — 클릭 시 그래프 교체 */}
                <button
                  onClick={() => handleCardClick(label.id)}
                  className="flex items-center justify-between w-full px-3 py-2.5 text-left"
                >
                  <span className={`text-sm font-semibold truncate ${activeLabelId === label.id ? "text-indigo-700" : "text-gray-800"}`}>
                    {label.labelName}
                  </span>
                  <span className="text-xs text-gray-500 shrink-0 ml-2 font-medium">
                    {label.members.length}명
                  </span>
                </button>

                {/* 멤버 칩 목록 (활성 카드만) */}
                {activeLabelId === label.id && (
                  <div className="px-3 pb-2">
                    {label.members.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {label.members.map((m) => (
                          <span key={m.id} className="flex items-center gap-1 text-xs pl-2 pr-1 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                            {m.nickname}
                            <button
                              onClick={() => handleRemoveMember(label.id, m.id)}
                              className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-indigo-300 text-indigo-500 hover:text-indigo-800 transition"
                              title="멤버 삭제"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mb-2">멤버가 없습니다.</p>
                    )}
                  </div>
                )}

                {/* 멤버 추가 검색 */}
                <div className="px-3 pb-2">
                  <button
                    onClick={() => handleToggleSearch(label.id)}
                    className="w-full text-xs py-1 rounded-md border border-indigo-300 text-indigo-600 font-medium hover:bg-indigo-50 transition"
                  >
                    {searchOpenLabelId === label.id ? "닫기" : "＋ 멤버 추가"}
                  </button>

                  {searchOpenLabelId === label.id && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="친구 이름 검색..."
                        autoFocus
                        className="w-full text-sm text-gray-900 placeholder-gray-400 border border-gray-400 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-1"
                      />
                      <div className="max-h-40 overflow-y-auto flex flex-col gap-0.5">
                        {filteredFriends.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-2">
                            {searchQuery ? "검색 결과 없음" : "추가할 수 있는 친구가 없습니다"}
                          </p>
                        ) : (
                          filteredFriends.map((f) => {
                            const key = `${label.id}-${f.friendId}`;
                            const isAdding = addingMemberLabelId === key;
                            return (
                              <button
                                key={f.friendId}
                                onClick={() => handleAddMemberFromSearch(label.id, f)}
                                disabled={isAdding}
                                className="text-left text-xs px-2 py-1.5 rounded-md hover:bg-indigo-50 text-gray-700 transition disabled:opacity-50 flex items-center justify-between"
                              >
                                <span>
                                  {f.friendAlias && f.friendAlias !== f.friendNickname ? (
                                    <>{f.friendAlias} <span className="text-gray-400">{f.friendNickname}</span></>
                                  ) : (
                                    f.friendNickname
                                  )}
                                </span>
                                {isAdding && <span className="text-indigo-400">추가 중...</span>}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
