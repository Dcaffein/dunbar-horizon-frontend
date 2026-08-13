import Link from "next/link";
import { resolveVerification } from "@/app/actions/auth";
import SignupCredentialForm from "./SignupCredentialForm";

interface VerifyEmailPageProps {
  searchParams: Promise<{ token?: string }>;
}

function LinkErrorScreen({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
      <div className="mx-auto h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
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
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-600 mb-8">{description}</p>
      <Link
        href="/signup"
        className="w-full block py-3 px-4 rounded-lg text-white font-semibold bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all"
      >
        처음부터 다시 시작하기
      </Link>
    </div>
  );
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  // 로그인 상태로 이 경로에 들어온 경우는 proxy.ts 에서 이미 걸러 "/" 로 보낸다.
  const { token } = await searchParams;

  if (!token) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <LinkErrorScreen
          title="잘못된 접근입니다"
          description="인증 링크를 통해 접속해주세요."
        />
      </main>
    );
  }

  const result = await resolveVerification(token);

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {result.status === "valid" ? (
        <SignupCredentialForm token={token} email={result.email} />
      ) : result.status === "error" ? (
        <LinkErrorScreen
          title="일시적인 오류입니다"
          description="잠시 후 다시 시도해 주세요."
        />
      ) : (
        <LinkErrorScreen
          title="인증 링크가 만료되었습니다"
          description="링크는 발송 후 1시간 동안만 유효합니다. 이메일 입력부터 다시 진행해주세요."
        />
      )}
    </main>
  );
}
