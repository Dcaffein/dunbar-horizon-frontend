"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { signupAction, sendVerificationEmail } from "@/app/actions/auth";
import Link from "next/link";

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
      {pending ? "가입 처리 중..." : "회원가입 완료"}
    </button>
  );
}

export default function SignupPage() {
  const [state, formAction] = useActionState(signupAction, initialState);
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const handleSendVerification = async () => {
    if (!submittedEmail || isSending) return;
    setIsSending(true);
    try {
      const result = await sendVerificationEmail(submittedEmail);
      if (result.success) {
        setEmailSent(true);
      } else {
        alert(result.message || "이메일 발송에 실패했습니다.");
      }
    } catch (error) {
      alert("오류가 발생했습니다.");
    } finally {
      setIsSending(false);
    }
  };

  if (state.success) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          {!emailSent ? (
            <>
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                회원가입 완료!
              </h2>
              <p className="text-gray-600 mb-8">
                환영합니다. 계정 보안을 위해
                <br />
                이메일 인증을 진행해주세요.
              </p>
              <button
                onClick={handleSendVerification}
                disabled={isSending}
                className="w-full py-3 px-4 rounded-lg text-white font-semibold bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all"
              >
                {isSending ? "전송 중..." : "인증 메일 발송하기"}
              </button>
            </>
          ) : (
            <>
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
              <p className="text-gray-600 mb-8">
                <span className="font-semibold text-indigo-600">
                  {submittedEmail}
                </span>{" "}
                로<br />
                인증 메일을 보냈습니다.
              </p>
              <div className="space-y-4">
                <Link
                  href="/login"
                  className="block w-full py-3 px-4 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 font-semibold shadow-md text-center"
                >
                  로그인 하러 가기
                </Link>
                <button
                  onClick={handleSendVerification}
                  disabled={isSending}
                  className="text-sm text-gray-500 hover:text-indigo-600 underline"
                >
                  메일을 받지 못하셨나요? 재발송하기
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">GooRoom</h1>
          <p className="text-gray-500 mt-2">새 계정 만들기</p>
        </div>

        <form
          action={(formData) => {
            setSubmittedEmail(formData.get("email") as string);
            formAction(formData);
          }}
          className="space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이메일
            </label>
            <input
              name="email"
              type="email"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50 focus:bg-white"
              placeholder="user@example.com"
            />
            {state.errors?.email && (
              <p className="text-xs text-red-500 mt-1 pl-1">
                {state.errors.email[0]}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              닉네임
            </label>
            <input
              name="nickname"
              type="text"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50 focus:bg-white"
            />
            {state.errors?.nickname && (
              <p className="text-xs text-red-500 mt-1 pl-1">
                {state.errors.nickname[0]}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호
            </label>
            <input
              name="password"
              type="password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50 focus:bg-white"
              placeholder="4자 이상"
            />
            {state.errors?.password && (
              <p className="text-xs text-red-500 mt-1 pl-1">
                {state.errors.password[0]}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호 확인
            </label>
            <input
              name="confirmPassword"
              type="password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50 focus:bg-white"
              placeholder="비밀번호 재입력"
            />
            {state.errors?.confirmPassword && (
              <p className="text-xs text-red-500 mt-1 pl-1">
                {state.errors.confirmPassword[0]}
              </p>
            )}
          </div>

          {state.message && (
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
