"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { MyProfileResult } from "@/api/model/myProfileResult";
import { presignProfileImageAction, updateProfileAction } from "@/app/actions/profile";

interface MyProfileProps {
  profile: MyProfileResult;
}

export default function MyProfile({ profile }: MyProfileProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nickname, setNickname] = useState(profile.nickname ?? "");
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameSuccess, setNicknameSuccess] = useState(false);

  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  async function handleNicknameSave() {
    if (nickname.length < 2) { setNicknameError("닉네임은 2자 이상이어야 합니다."); return; }
    if (nickname.length > 20) { setNicknameError("닉네임은 20자 이하여야 합니다."); return; }

    setNicknameError(null);
    setNicknameSaving(true);
    setNicknameSuccess(false);

    const result = await updateProfileAction({ nickname });
    setNicknameSaving(false);
    if (result.success) {
      setNicknameSuccess(true);
      router.refresh();
    } else {
      setNicknameError(result.message ?? "저장에 실패했습니다.");
    }
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError(null);
    setImageUploading(true);

    try {
      const presignResult = await presignProfileImageAction(file.type);
      if (!presignResult.success || !presignResult.data?.uploadUrl || !presignResult.data?.objectKey) {
        throw new Error(presignResult.message ?? "업로드 준비 실패");
      }

      await fetch(presignResult.data.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      const updateResult = await updateProfileAction({
        nickname: profile.nickname ?? nickname,
        profileImageKey: presignResult.data.objectKey,
      });
      if (!updateResult.success) throw new Error(updateResult.message ?? "프로필 업데이트 실패");

      router.refresh();
    } catch {
      setImageError("이미지 변경에 실패했습니다.");
    } finally {
      setImageUploading(false);
      e.target.value = "";
    }
  }

  const initial = (profile.nickname ?? profile.email ?? "?")[0].toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-8">
        <h1 className="text-xl font-bold text-gray-900">내 프로필</h1>

        {/* 프로필 이미지 */}
        <div className="flex flex-col items-center gap-4">
          {profile.profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.profileImageUrl}
              alt="프로필 이미지"
              className="w-24 h-24 rounded-full object-cover border border-gray-200"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center text-3xl font-bold text-indigo-600">
              {initial}
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={imageUploading}
            className="text-sm text-indigo-600 font-medium hover:underline disabled:opacity-50"
          >
            {imageUploading ? "업로드 중..." : "이미지 변경"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
          {imageError && <p className="text-xs text-red-500">{imageError}</p>}
        </div>

        {/* 이메일 */}
        <div className="space-y-1">
          <p className="text-xs font-bold text-gray-500">이메일</p>
          <p className="text-sm text-gray-700">{profile.email ?? "—"}</p>
        </div>

        {/* 닉네임 수정 */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-500">닉네임</p>
          <p className="text-sm text-gray-700 mb-3">{profile.nickname ?? "—"}</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={nickname}
              onChange={(e) => { setNickname(e.target.value); setNicknameSuccess(false); }}
              placeholder="새 닉네임 입력"
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
            />
            <button
              onClick={handleNicknameSave}
              disabled={nicknameSaving}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {nicknameSaving ? "저장 중..." : "저장"}
            </button>
          </div>
          {nicknameError && <p className="text-xs text-red-500">{nicknameError}</p>}
          {nicknameSuccess && <p className="text-xs text-indigo-600">닉네임이 변경되었습니다.</p>}
        </div>
      </div>
    </div>
  );
}
