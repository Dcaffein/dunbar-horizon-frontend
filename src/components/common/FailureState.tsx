"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Failure } from "@/api/apiClient";

/**
 * 조회에 **실패**했을 때 쓴다. 데이터가 없는 것과는 다르다 — 그쪽은 `EmptyState`.
 *
 * 실패했다는 것은 데이터가 있는지 없는지 **모른다**는 뜻이므로,
 * "없습니다"라고 단정하지 않고 다시 가져올 수단을 준다.
 */
export default function FailureState({
  failure,
  inline = false,
  onRetry,
}: {
  failure: Failure;
  /** 화면 일부(댓글 섹션 등)에 들어갈 때. 세로 여백을 줄인다. */
  inline?: boolean;
  /** 지정하지 않으면 `router.refresh()` 로 서버 컴포넌트를 다시 그린다. */
  onRetry?: () => void | Promise<void>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isRunning, setIsRunning] = useState(false);

  // 연결 문제는 다시 시도하면 될 가능성이 높다. 서버가 거절한 것(http)은 사유가 이미 문구에 있다.
  const isTransient = failure.kind === "network" || failure.kind === "timeout";

  async function handleRetry() {
    if (onRetry) {
      setIsRunning(true);
      try {
        await onRetry();
      } finally {
        setIsRunning(false);
      }
      return;
    }
    startTransition(() => router.refresh());
  }

  const busy = isPending || isRunning;

  return (
    <div
      className={`flex flex-col items-center justify-center text-gray-400 ${inline ? "py-6" : "py-16"}`}
      role="status"
    >
      <svg
        className={`${inline ? "w-8 h-8 mb-2" : "w-12 h-12 mb-3"} text-gray-300`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 9v3.75m0 3.75h.008v.008H12v-.008zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>

      <p className={`${inline ? "text-xs" : "text-sm"} font-medium text-gray-500`}>
        {failure.message}
      </p>
      {isTransient && (
        <p className="mt-1 text-xs text-gray-400">잠시 후 다시 시도해 주세요.</p>
      )}

      <button
        type="button"
        onClick={handleRetry}
        disabled={busy}
        className={`mt-3 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 ${
          inline ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm"
        }`}
      >
        {busy ? "다시 불러오는 중…" : "다시 시도"}
      </button>
    </div>
  );
}
