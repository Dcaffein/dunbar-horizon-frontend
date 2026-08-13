"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  requestVerification,
  requestVerificationAction,
} from "@/app/actions/auth";

const initialState = { message: "" };

const RESEND_COOLDOWN_SECONDS = 60;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`w-full py-3 px-4 rounded-lg text-white font-bold shadow-md transition-all
        ${
          pending
            ? "bg-indigo-300 cursor-not-allowed"
            : "bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg transform hover:-translate-y-0.5"
        }`}
    >
      {pending ? "전송 중..." : "인증 메일 받기"}
    </button>
  );
}

export default function SignupPage() {
  const [state, formAction] = useActionState(
    requestVerificationAction,
    initialState,
  );
  const [email, setEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // 백엔드에 레이트 리밋이 없어 누르는 만큼 메일이 나간다.
  // 이전 링크는 그대로 유효하므로 쿨다운의 목적은 링크 보호가 아니라 메일 남발 방지다.
  const handleResend = async () => {
    if (isResending || cooldown > 0) return;

    setIsResending(true);
    setResendMessage("");

    const result = await requestVerification(email);

    setResendMessage(result.message);
    setIsResending(false);
    if (result.success) {
      setCooldown(RESEND_COOLDOWN_SECONDS);
    }
  };

  if (state.success) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 mb-6">
            <svg
              className="h-8 w-8 text-indigo-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            메일함을 확인해주세요
          </h2>
          <p className="text-gray-600 mb-2">
            <span className="font-semibold text-indigo-600">{email}</span> 로
            <br />
            인증 메일을 보냈습니다. 링크를 열어 가입을 마무리해주세요.
          </p>
          <p className="text-sm text-gray-400 mb-8">
            링크는 1시간 후 만료됩니다. 이미 가입된 계정이라면 로그인 안내
            메일이 갑니다.
          </p>

          <div className="space-y-4">
            <Link
              href="/login"
              className="block w-full py-3 px-4 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 font-semibold shadow-md text-center"
            >
              로그인 하러 가기
            </Link>
            <button
              onClick={handleResend}
              disabled={isResending || cooldown > 0}
              className="text-sm text-gray-500 hover:text-indigo-600 underline disabled:text-gray-300 disabled:no-underline disabled:cursor-not-allowed"
            >
              {isResending
                ? "전송 중..."
                : cooldown > 0
                  ? `다시 보내기 (${cooldown}초 후 가능)`
                  : "메일을 받지 못하셨나요? 다시 보내기"}
            </button>
            {resendMessage && (
              <p className="text-xs text-gray-500">{resendMessage}</p>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">
            Dunbar Horizon
          </h1>
          <p className="text-gray-500 mt-2">새 계정 만들기</p>
        </div>

        <form action={formAction} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              이메일
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50 focus:bg-white"
              placeholder="user@example.com"
            />
            <p className="text-xs text-gray-400 mt-1 pl-1">
              입력하신 주소로 인증 메일을 보내드립니다. 닉네임과 비밀번호는 메일
              링크에서 설정합니다.
            </p>
          </div>

          {state.message && !state.success && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg text-center font-medium">
              {state.message}
            </div>
          )}

          <SubmitButton />
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            이미 계정이 있으신가요?{" "}
            <Link
              href="/login"
              className="font-semibold text-indigo-600 hover:text-indigo-500 hover:underline"
            >
              로그인 하기
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
