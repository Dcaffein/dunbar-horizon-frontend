"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { signupAction, type SignupFormState } from "@/app/actions/auth";

const initialState: SignupFormState = { message: "" };

interface SignupCredentialFormProps {
  token: string;
  email?: string;
}

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
      {pending ? "가입 처리 중..." : "가입 완료하기"}
    </button>
  );
}

export default function SignupCredentialForm({
  token,
  email,
}: SignupCredentialFormProps) {
  const [state, formAction] = useActionState(signupAction, initialState);

  // React 19 는 폼 액션이 끝나면 비제어 입력을 초기화한다.
  // 그대로 두면 검증 실패 시 안내 문구만 남고 입력값이 전부 사라져 처음부터 다시 쳐야 한다.
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // 폼 안에서 해결할 수 없는 결과는 화면 자체를 바꾼다.
  // GET 은 성공했는데 제출 시점에 만료되는 경우가 정상 시나리오로 존재한다.
  if (state.outcome === "expired" || state.outcome === "alreadyRegistered") {
    const isExpired = state.outcome === "expired";

    return (
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isExpired ? "인증 링크가 만료되었습니다" : "이미 가입된 계정입니다"}
        </h2>
        <p className="text-gray-600 mb-8">{state.message}</p>
        <Link
          href={isExpired ? "/signup" : "/login"}
          className="w-full block py-3 px-4 rounded-lg text-white font-semibold bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all"
        >
          {isExpired ? "처음부터 다시 시작하기" : "로그인 하러 가기"}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">
          Dunbar Horizon
        </h1>
        <p className="text-gray-500 mt-2">가입을 마무리해주세요</p>
      </div>

      <form action={formAction} className="space-y-5">
        <input type="hidden" name="token" value={token} />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            이메일
          </label>
          <p className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-500">
            {email ?? "인증된 이메일"}
          </p>
        </div>

        <div>
          <label
            htmlFor="nickname"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            닉네임
          </label>
          <input
            id="nickname"
            name="nickname"
            type="text"
            required
            maxLength={20}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50 focus:bg-white"
            placeholder="1~20자"
          />
          {state.errors?.nickname && (
            <p className="text-xs text-red-500 mt-1 pl-1">
              {state.errors.nickname[0]}
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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50 focus:bg-white"
            placeholder="영문·숫자·특수문자 포함 8~20자"
          />
          <p className="text-xs text-gray-400 mt-1 pl-1">
            영문, 숫자, 특수문자(!@#$%^&*)를 모두 포함해야 합니다.
          </p>
          {state.errors?.password && (
            <p className="text-xs text-red-500 mt-1 pl-1">
              {state.errors.password[0]}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            비밀번호 확인
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
    </div>
  );
}
