"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { springClient } from "@/lib/springClient";
import { BASE_URL } from "@/lib/constants";
import type { SignUpRequest } from "@/types/auth";

const loginSchema = z.object({
  email: z
    .email("유효한 이메일 형식이 아닙니다.")
    .min(1, "이메일을 입력해주세요."),
  password: z.string().min(1, "비밀번호를 입력해주세요."),
});

const signupSchema = z
  .object({
    email: z
      .string()
      .min(1, "이메일을 입력해주세요.")
      .email("유효한 이메일 형식이 아닙니다."),
    nickname: z
      .string()
      .min(2, "닉네임은 2자 이상이어야 합니다.")
      .max(10, "닉네임은 10자 이하여야 합니다."),
    password: z.string().min(4, "비밀번호는 4자 이상이어야 합니다."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["confirmPassword"],
  });

export type AuthFormState = {
  success?: boolean;
  message?: string;
  code?: string;
  errors?: {
    email?: string[];
    password?: string[];
    nickname?: string[];
    confirmPassword?: string[];
  };
};

interface CookieOptions {
  path?: string;
  domain?: string;
  maxAge?: number;
  expires?: Date;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "lax" | "strict" | "none";
}

function parseSetCookie(header: string) {
  const parts = header.split(";").map((p) => p.trim());
  const [nameVal, ...attrs] = parts;
  const eq = nameVal.indexOf("=");
  if (eq === -1) return null;

  const name = nameVal.substring(0, eq);
  const value = nameVal.substring(eq + 1);

  const options: CookieOptions = {};

  attrs.forEach((attr) => {
    const [k, v] = attr.split("=");
    const key = k.toLowerCase();

    if (key === "path") options.path = v;
    if (key === "domain") options.domain = v;
    if (key === "max-age") options.maxAge = Number(v);
    if (key === "expires") options.expires = new Date(v);
    if (key === "httponly") options.httpOnly = true;
    if (key === "secure") options.secure = true;
    if (key === "samesite") {
      options.sameSite = v.toLowerCase() as "lax" | "strict" | "none";
    }
  });

  return { name, value, options };
}

export async function sendVerificationEmail(email: string) {
  const result = z.email().safeParse(email);
  if (!result.success) {
    return { success: false, message: "유효한 이메일 주소를 입력해주세요." };
  }

  try {
    const redirectPage = "/verify-email";
    await springClient.post("/api/v1/auth/email-verifications", {
      email,
      redirectPage,
    });

    return { success: true, message: "인증 이메일이 발송되었습니다." };
  } catch (_error) {
    return { success: false, message: "이메일 발송 실패" };
  }
}

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const validated = loginSchema.safeParse(rawData);

  if (!validated.success) {
    return {
      message: "입력 값을 확인해주세요.",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const { email, password } = validated.data;

  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));

      if (
        errorData.code === "UNVERIFIED" ||
        errorData.message?.includes("인증")
      ) {
        return {
          success: false,
          message: "이메일 인증이 필요합니다.",
          code: "UNVERIFIED",
        };
      }

      return { message: "아이디 또는 비밀번호가 일치하지 않습니다." };
    }

    const setCookieHeaders = res.headers.getSetCookie();
    if (setCookieHeaders) {
      const cookieStore = await cookies();
      setCookieHeaders.forEach((h) => {
        const parsed = parseSetCookie(h);
        if (parsed) cookieStore.set(parsed.name, parsed.value, parsed.options);
      });
    }
  } catch (_e) {
    console.error(_e);
    return { message: "서버 연결 중 오류가 발생했습니다." };
  }

  redirect("/");
}

export async function signupAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const rawData = {
    email: formData.get("email"),
    nickname: formData.get("nickname"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const validated = signupSchema.safeParse(rawData);

  if (!validated.success) {
    return {
      success: false,
      message: "입력 정보를 다시 확인해주세요.",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const { email, nickname, password } = validated.data;

  try {
    await springClient.post<void, SignUpRequest>("api/v1/users", {
      email,
      nickname,
      password,
    });

    return { success: true, message: "회원가입이 완료되었습니다." };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "회원가입 중 오류가 발생했습니다.";

    return { message: errorMessage };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;
  const refreshToken = cookieStore.get("refreshToken")?.value;

  try {
    if (accessToken && refreshToken) {
      await fetch(`${BASE_URL}/api/v1/auth/tokens`, {
        method: "DELETE",
        headers: {
          Cookie: `accessToken=${accessToken}; refreshToken=${refreshToken}`,
        },
      });
    }
  } catch (e) {
    console.error("Backend logout failed", e);
  }

  cookieStore.delete("accessToken");
  cookieStore.delete("refreshToken");

  redirect("/login");
}

export async function verifyEmailAction(token: string) {
  if (!token) {
    return { success: false, message: "유효하지 않은 인증 토큰입니다." };
  }

  try {
    await springClient.get(`/api/v1/auth/email-verifications?token=${token}`);

    return {
      success: true,
      message: "이메일 인증이 성공적으로 완료되었습니다!",
    };
  } catch (error) {
    console.error("Verification Error:", error);

    let message = "인증 토큰이 만료되었거나 유효하지 않습니다.";
    if (error instanceof Error) {
      message = error.message;
    }
    return { success: false, message };
  }
}
