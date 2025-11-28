"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useFormStatus } from "react-dom";
import { loginAction, sendVerificationEmail } from "@/app/actions/auth";
import { BASE_URL } from "@/lib/constants";

const initialState = { message: "" };

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
      {pending ? "로그인 중..." : "로그인"}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useActionState(loginAction, initialState);
  const [email, setEmail] = useState("");
  const [isResending, setIsResending] = useState(false);

  const handleResend = async () => {
    if (!email || isResending) return;
    setIsResending(true);
    const result = await sendVerificationEmail(email);
    alert(result.message);
    setIsResending(false);
  };

  const showResendButton =
    state.code === "UNVERIFIED" || state.message?.includes("인증");

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            GooRoom
          </h1>
        </div>

        <form action={formAction} className="space-y-6">
          <div className="space-y-4">
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-gray-50 focus:bg-white"
                placeholder="user@example.com"
              />
              {state.errors?.email && (
                <p className="text-xs text-red-500 mt-1 pl-1">
                  {state.errors.email[0]}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-gray-50 focus:bg-white"
                placeholder="••••••••"
              />
              {state.errors?.password && (
                <p className="text-xs text-red-500 mt-1 pl-1">
                  {state.errors.password[0]}
                </p>
              )}
            </div>
          </div>

          {state.message && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg text-center flex flex-col gap-2">
              <span className="font-medium">{state.message}</span>
              {showResendButton && (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="text-indigo-600 underline hover:text-indigo-800 font-semibold text-xs"
                >
                  {isResending ? "전송 중..." : "인증 메일 재발송하기"}
                </button>
              )}
            </div>
          )}

          <SubmitButton />
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white text-gray-500">
              소셜 계정으로 로그인
            </span>
          </div>
        </div>

        <a
          href={`${BASE_URL}/oauth2/authorization/google`}
          className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all transform hover:-translate-y-0.5"
        >
          <Image
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            width={20}
            height={20}
            className="mr-2"
          />
          Google 계정으로 계속하기
        </a>

        <p className="text-center text-sm text-gray-600">
          아직 계정이 없으신가요?{" "}
          <Link
            href="/signup"
            className="font-semibold text-indigo-600 hover:text-indigo-500 hover:underline"
          >
            회원가입 하기
          </Link>
        </p>
      </div>
    </main>
  );
}
