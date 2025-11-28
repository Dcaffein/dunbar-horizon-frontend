"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { verifyEmailAction } from "@/app/actions/auth";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("인증 처리 중입니다...");
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get("token");
      if (!token) {
        setStatus("error");
        setMessage("잘못된 접근입니다. 인증 링크를 다시 확인해주세요.");
        return;
      }

      if (isVerifying) return;
      setIsVerifying(true);

      const result = await verifyEmailAction(token);

      if (result.success) {
        setStatus("success");
        setMessage(result.message);
      } else {
        setStatus("error");
        setMessage(result.message);
      }

      setIsVerifying(false);
    };

    verifyToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router]);

  return (
    <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
      {status === "loading" && (
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <h2 className="text-xl font-bold text-gray-800">인증 확인 중...</h2>
          <p className="text-gray-500 mt-2">잠시만 기다려주세요.</p>
        </div>
      )}

      {status === "success" && (
        <div className="flex flex-col items-center">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-6">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">인증 완료!</h2>
          <p className="text-gray-600 mb-8">{message}</p>
          <Link
            href="/login"
            className="w-full block py-3 px-4 rounded-lg text-white font-semibold bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all"
          >
            로그인 하러 가기
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center">
          <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">인증 실패</h2>
          <p className="text-gray-600 mb-8">{message}</p>
          <Link
            href="/login"
            className="w-full block py-3 px-4 rounded-lg text-white font-semibold bg-gray-600 hover:bg-gray-700 shadow-md transition-all"
          >
            로그인 화면으로 돌아가기
          </Link>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Suspense fallback={<div>Loading...</div>}>
        <VerifyEmailContent />
      </Suspense>
    </main>
  );
}
