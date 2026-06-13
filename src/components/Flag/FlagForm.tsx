"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createFlagAction, updateFlagDetailsAction, updateFlagCapacityAction, updateFlagScheduleAction } from "@/app/actions/flag";

export interface FlagFormInitialValues {
  title: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  deadline: string;
  capacity: string;
}

interface FlagFormProps {
  parentFlagId?: number;
  flagId?: number;
  initialValues?: FlagFormInitialValues;
}


export default function FlagForm({ parentFlagId, flagId, initialValues }: FlagFormProps) {
  const router = useRouter();
  const isEncore = !!parentFlagId;
  const isEdit = !!flagId;

  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [startDateTime, setStartDateTime] = useState(initialValues?.startDateTime ?? "");
  const [endDateTime, setEndDateTime] = useState(initialValues?.endDateTime ?? "");
  const [deadline, setDeadline] = useState(initialValues?.deadline ?? "");
  const [capacity, setCapacity] = useState(initialValues?.capacity ?? "");
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

  async function handleCreate() {
    const result = await createFlagAction({
      title: title.trim(),
      description: description.trim(),
      startDateTime: new Date(startDateTime).toISOString(),
      endDateTime: new Date(endDateTime).toISOString(),
      ...(deadline ? { deadline: new Date(deadline).toISOString() } : {}),
      ...(capacity ? { capacity: Number(capacity) } : {}),
      ...(parentFlagId ? { parentFlagId } : {}),
    });

    if (result.success) {
      router.push("/flags");
    } else {
      setErrors({ submit: result.message ?? "Flag 생성에 실패했습니다." });
    }
  }

  async function handleEdit() {
    if (!flagId || !initialValues) return;

    const detailsChanged =
      title.trim() !== initialValues.title || description.trim() !== initialValues.description;
    const capacityChanged = capacity !== initialValues.capacity;
    const scheduleChanged =
      startDateTime !== initialValues.startDateTime ||
      endDateTime !== initialValues.endDateTime ||
      deadline !== initialValues.deadline;

    if (!detailsChanged && !capacityChanged && !scheduleChanged) {
      router.push(`/flags/${flagId}`);
      return;
    }

    const calls: Promise<{ success: boolean; message?: string }>[] = [];

    if (detailsChanged) {
      calls.push(updateFlagDetailsAction(flagId, { title: title.trim(), description: description.trim() }));
    }
    if (capacityChanged) {
      calls.push(updateFlagCapacityAction(flagId, capacity ? { capacity: Number(capacity) } : {}));
    }
    if (scheduleChanged) {
      calls.push(
        updateFlagScheduleAction(flagId, {
          startDateTime: new Date(startDateTime).toISOString(),
          endDateTime: new Date(endDateTime).toISOString(),
          ...(deadline ? { deadline: new Date(deadline).toISOString() } : {}),
        }),
      );
    }

    const results = await Promise.all(calls);
    const failed = results.find((r) => !r.success);

    if (failed) {
      setErrors({ submit: failed.message ?? "수정에 실패했습니다." });
    } else {
      router.push(`/flags/${flagId}`);
    }
  }

  async function handleSubmit() {
    if (!validate()) return;
    setIsSubmitting(true);

    if (isEdit) {
      await handleEdit();
    } else {
      await handleCreate();
    }

    setIsSubmitting(false);
  }

  function headerTitle() {
    if (isEdit) return "Flag 수정";
    if (isEncore) return "Encore 생성";
    return "Flag 만들기";
  }

  function submitLabel() {
    if (isSubmitting) return isEdit ? "저장 중..." : "생성 중...";
    if (isEdit) return "저장";
    if (isEncore) return "Encore 생성";
    return "Flag 만들기";
  }

  function splitDt(dt: string): [string, string] {
    const [d = "", t = ""] = dt.split("T");
    return [d, t];
  }

  const [startDate, startTime] = splitDt(startDateTime);
  const [endDate, endTime] = splitDt(endDateTime);
  const [deadlineDate, deadlineTime] = splitDt(deadline);

  const dtInputCls = "text-sm text-gray-800 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-300 transition-colors";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 shrink-0">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">{headerTitle()}</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-4 space-y-3">

          {isEncore && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3">
              <p className="text-xs text-indigo-700 font-medium leading-relaxed">
                이전 Flag를 기반으로 앙코르를 생성합니다. 새로운 제목과 일정을 입력하세요. 생성하면 이전 참여자들에게 초대장이 발송됩니다.
              </p>
            </div>
          )}

          {/* 기본 정보 */}
          <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] px-4 py-4 space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">기본 정보</p>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">제목</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Flag 제목을 입력하세요"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
              />
              {errors.title && <p className="text-xs text-red-500 mt-0.5">{errors.title}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">설명</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Flag를 설명해주세요"
                rows={3}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-indigo-400"
              />
              {errors.description && <p className="text-xs text-red-500 mt-0.5">{errors.description}</p>}
            </div>
          </div>

          {/* 일정 */}
          <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] px-4 py-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">일정</p>

            {/* 컬럼 헤더 */}
            <div className="flex items-center gap-2 mb-1.5 pl-10">
              <span className="flex-1 text-[11px] text-gray-400">날짜</span>
              <span className="w-24 text-[11px] text-gray-400">시간</span>
            </div>

            {/* 시작 */}
            <div className="flex items-center gap-2 mb-2">
              <span className="w-10 text-xs font-medium text-gray-500 shrink-0">시작</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDateTime(`${e.target.value}T${startTime || "00:00"}`)}
                className={`flex-1 ${dtInputCls}`}
              />
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartDateTime(`${startDate}T${e.target.value}`)}
                className={`w-24 ${dtInputCls}`}
              />
            </div>
            {errors.startDateTime && <p className="text-xs text-red-400 mb-2 pl-10">{errors.startDateTime}</p>}

            {/* 종료 */}
            <div className="flex items-center gap-2">
              <span className="w-10 text-xs font-medium text-gray-500 shrink-0">종료</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDateTime(`${e.target.value}T${endTime || "00:00"}`)}
                className={`flex-1 ${dtInputCls}`}
              />
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndDateTime(`${endDate}T${e.target.value}`)}
                className={`w-24 ${dtInputCls}`}
              />
            </div>
            {errors.endDateTime && <p className="text-xs text-red-400 mt-1 pl-10">{errors.endDateTime}</p>}

            <div className="border-t border-gray-100 mt-4 pt-4">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-xs font-medium text-gray-500">모집 마감</span>
                <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">선택</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-10 shrink-0" />
                <input
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => setDeadline(`${e.target.value}T${deadlineTime || "00:00"}`)}
                  className={`flex-1 ${dtInputCls}`}
                />
                <input
                  type="time"
                  value={deadlineTime}
                  onChange={(e) => setDeadline(`${deadlineDate}T${e.target.value}`)}
                  className={`w-24 ${dtInputCls}`}
                />
              </div>
            </div>
          </div>

          {/* 참여 설정 */}
          <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] px-4 py-4 space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">참여 설정</p>

            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <label className="text-xs font-semibold text-gray-500">최대 인원</label>
                <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">선택</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="제한 없음"
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
                />
                <span className="text-sm text-gray-400 shrink-0">명</span>
              </div>
              {errors.capacity && <p className="text-xs text-red-500 mt-1">{errors.capacity}</p>}
            </div>
          </div>

          {errors.submit && <p className="text-sm text-red-500 text-center">{errors.submit}</p>}
        </div>
      </div>

      <div className="bg-white border-t border-gray-100 px-4 py-4 shrink-0">
        <div className="max-w-lg mx-auto flex gap-2">
          {isEdit ? (
            <button
              onClick={() => router.back()}
              disabled={isSubmitting}
              className="flex-1 py-3 border border-gray-200 text-gray-500 text-sm font-medium rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              취소
            </button>
          ) : (
            <button
              onClick={() => router.push("/flags")}
              disabled={isSubmitting}
              className="flex-1 py-3 border border-gray-200 text-gray-500 text-sm font-medium rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              취소
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {submitLabel()}
          </button>
        </div>
      </div>
    </div>
  );
}
