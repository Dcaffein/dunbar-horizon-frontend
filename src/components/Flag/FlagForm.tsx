"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createFlagAction } from "@/app/actions/flag";

interface FlagFormProps {
  parentFlagId?: number;
}

function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function FlagForm({ parentFlagId }: FlagFormProps) {
  const router = useRouter();
  const isEncore = !!parentFlagId;

  const now = new Date();
  const defaultStart = new Date(now.getTime() + 60 * 60 * 1000);
  const defaultEnd = new Date(now.getTime() + 3 * 60 * 60 * 1000);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDateTime, setStartDateTime] = useState(toLocalDatetimeValue(defaultStart));
  const [endDateTime, setEndDateTime] = useState(toLocalDatetimeValue(defaultEnd));
  const [deadline, setDeadline] = useState("");
  const [capacity, setCapacity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "제목을 입력해주세요.";
    if (!description.trim()) e.description = "설명을 입력해주세요.";
    if (!startDateTime) e.startDateTime = "시작 일시를 입력해주세요.";
    if (!endDateTime) e.endDateTime = "종료 일시를 입력해주세요.";
    if (startDateTime && endDateTime && new Date(startDateTime) >= new Date(endDateTime)) {
      e.endDateTime = "종료 일시는 시작 일시보다 이후여야 합니다.";
    }
    if (capacity && (isNaN(Number(capacity)) || Number(capacity) < 1)) {
      e.capacity = "최대 인원은 1 이상이어야 합니다.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setIsSubmitting(true);

    const result = await createFlagAction({
      title: title.trim(),
      description: description.trim(),
      startDateTime: new Date(startDateTime).toISOString(),
      endDateTime: new Date(endDateTime).toISOString(),
      ...(deadline ? { deadline: new Date(deadline).toISOString() } : {}),
      ...(capacity ? { capacity: Number(capacity) } : {}),
      ...(parentFlagId ? { parentFlagId } : {}),
    });

    setIsSubmitting(false);

    if (result.success) {
      router.push("/flags");
    } else {
      setErrors({ submit: result.message ?? "Flag 생성에 실패했습니다." });
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
        <h1 className="text-lg font-bold text-gray-900">
          {isEncore ? "Encore 생성" : "Flag 만들기"}
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
          {isEncore && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2.5 text-xs text-indigo-700 font-medium">
              이전 Flag를 기반으로 Encore를 생성합니다. 새로운 제목과 일정을 입력해주세요.
            </div>
          )}

          {/* 제목 */}
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">제목 *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Flag 제목을 입력하세요"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
            />
            {errors.title && <p className="text-xs text-red-500 mt-0.5">{errors.title}</p>}
          </div>

          {/* 설명 */}
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">설명 *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Flag를 설명해주세요"
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-indigo-400"
            />
            {errors.description && <p className="text-xs text-red-500 mt-0.5">{errors.description}</p>}
          </div>

          {/* 시작 일시 */}
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">시작 일시 *</label>
            <input
              type="datetime-local"
              value={startDateTime}
              onChange={(e) => setStartDateTime(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
            />
            {errors.startDateTime && <p className="text-xs text-red-500 mt-0.5">{errors.startDateTime}</p>}
          </div>

          {/* 종료 일시 */}
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">종료 일시 *</label>
            <input
              type="datetime-local"
              value={endDateTime}
              onChange={(e) => setEndDateTime(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
            />
            {errors.endDateTime && <p className="text-xs text-red-500 mt-0.5">{errors.endDateTime}</p>}
          </div>

          {/* 모집 마감일 */}
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">모집 마감일 <span className="font-normal text-gray-400">(선택)</span></label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
            />
          </div>

          {/* 최대 인원 */}
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">최대 인원 <span className="font-normal text-gray-400">(선택)</span></label>
            <input
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="예: 10"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
            />
            {errors.capacity && <p className="text-xs text-red-500 mt-0.5">{errors.capacity}</p>}
          </div>

          {errors.submit && <p className="text-sm text-red-500">{errors.submit}</p>}
        </div>
      </div>

      <div className="bg-white border-t border-gray-100 px-4 py-4 shrink-0">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full max-w-lg mx-auto block py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? "생성 중..." : isEncore ? "Encore 생성" : "Flag 만들기"}
        </button>
      </div>
    </div>
  );
}
