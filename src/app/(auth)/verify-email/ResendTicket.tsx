"use client";

import { useState } from "react";
import { sendVerificationEmail } from "@/app/actions/auth";

export default function ResendTicket() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setMessage("");

    const result = await sendVerificationEmail(email);

    setMessage(result.message);
    setIsLoading(false);
  };

  return (
    <div className="mt-6 p-6 bg-gray-50 rounded-lg border border-gray-100">
      <h3 className="text-sm font-bold text-gray-700 mb-3">
        인증 메일이 만료되었거나 받지 못하셨나요?
      </h3>
      <form onSubmit={handleResend} className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="가입하신 이메일을 입력하세요"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          required
        />
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-2 px-4 rounded-lg text-white text-sm font-semibold transition-all
            ${
              isLoading
                ? "bg-indigo-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
        >
          {isLoading ? "전송 중..." : "인증 메일 재발송"}
        </button>
      </form>
      {message && (
        <p
          className={`text-xs mt-3 text-center font-medium ${
            message.includes("실패") ? "text-red-500" : "text-blue-600"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
