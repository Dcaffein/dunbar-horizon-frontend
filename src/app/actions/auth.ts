"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BASE_URL } from "@/lib/constants";

const loginSchema = z.object({
  email: z
    .email("유효한 이메일 형식이 아닙니다.")
    .min(1, "이메일을 입력해주세요."),
  password: z.string().min(1, "비밀번호를 입력해주세요."),
});

const signupSchema = z
  .object({
    token: z.string().min(1, "인증 정보가 올바르지 않습니다."),
    nickname: z
      .string()
      .min(1, "닉네임을 입력해주세요.")
      .max(20, "닉네임은 20자 이하여야 합니다."),
    password: z
      .string()
      .min(8, "비밀번호는 8자 이상이어야 합니다.")
      .max(20, "비밀번호는 20자 이하여야 합니다.")
      .regex(
        /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]+$/,
        "영문, 숫자, 특수문자(!@#$%^&*)를 모두 포함해야 합니다.",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["confirmPassword"],
  });

export type AuthFormState = {
  success?: boolean;
  message?: string;
  errors?: {
    email?: string[];
    password?: string[];
    nickname?: string[];
    confirmPassword?: string[];
  };
};

/**
 * 폼 안에서 처리할 수 없어 화면 자체를 전환해야 하는 결과.
 * expired 는 링크 재발급, alreadyRegistered 는 로그인으로 유도한다.
 */
export type SignupOutcome = "expired" | "alreadyRegistered" | "serverError";

export type SignupFormState = AuthFormState & {
  outcome?: SignupOutcome;
};

export type VerificationResult =
  | { status: "valid"; email?: string }
  | { status: "invalid" }
  | { status: "error" };

const EXPIRED_MESSAGE = "인증 링크가 만료되었습니다. 처음부터 다시 진행해 주세요.";
const ALREADY_REGISTERED_MESSAGE =
  "이미 가입이 완료된 이메일입니다. 로그인해 주세요.";
const TEMPORARY_ERROR_MESSAGE =
  "일시적인 오류입니다. 잠시 후 다시 시도해 주세요.";

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

async function applySetCookieHeaders(headers: string[]) {
  if (headers.length === 0) return;

  const cookieStore = await cookies();

  headers.forEach((header) => {
    const parsed = parseSetCookie(header);
    if (parsed) {
      cookieStore.set(parsed.name, parsed.value, parsed.options);
    }
  });
}

interface ApiErrorBody {
  error?: string;
  message?: string;
  validation?: Record<string, string>;
}

/**
 * 백엔드 예외 메시지를 그대로 노출하지 않는다.
 * 다만 validation 값은 필드 단위 입력 안내이므로 해당 입력 아래에 그대로 보여준다.
 */
function mapSignupError(status: number, body: ApiErrorBody): SignupFormState {
  if (status === 400) {
    const validation = body.validation ?? {};

    // token 은 사용자가 폼에서 고칠 수 있는 값이 아니므로 만료와 동일하게 다룬다.
    if (validation.token) {
      return { message: EXPIRED_MESSAGE, outcome: "expired" };
    }

    const errors: AuthFormState["errors"] = {};
    if (validation.nickname) errors.nickname = [validation.nickname];
    if (validation.password) errors.password = [validation.password];

    return { message: "입력 정보를 다시 확인해주세요.", errors };
  }

  if (status === 409) {
    return {
      message: ALREADY_REGISTERED_MESSAGE,
      outcome: "alreadyRegistered",
    };
  }

  if (status === 410) {
    return { message: EXPIRED_MESSAGE, outcome: "expired" };
  }

  return { message: TEMPORARY_ERROR_MESSAGE, outcome: "serverError" };
}

export async function requestVerification(email: string) {
  const validated = z.email().safeParse(email);
  if (!validated.success) {
    return { success: false, message: "유효한 이메일 주소를 입력해주세요." };
  }

  try {
    const response = await fetch(`${BASE_URL}/api/auth/verifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      cache: "no-store",
    });

    if (!response.ok) {
      return { success: false, message: TEMPORARY_ERROR_MESSAGE };
    }

    return { success: true, message: "인증 메일을 보냈습니다." };
  } catch (error) {
    console.error("requestVerification error:", error);
    return { success: false, message: "서버 연결 중 오류가 발생했습니다." };
  }
}

export async function requestVerificationAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = formData.get("email");

  if (typeof email !== "string") {
    return { success: false, message: "이메일을 입력해주세요." };
  }

  const result = await requestVerification(email);

  if (!result.success) {
    return { success: false, message: result.message };
  }

  return { success: true, message: result.message };
}

/**
 * 토큰을 소비하지 않고 유효성만 확인한다. 폼을 그리기 전에 호출한다.
 * apiClient 를 쓰지 않는 이유: 401 응답 시 전역 redirect("/login") 에 걸려
 * 계정이 없는 사용자가 로그인 화면으로 떠밀린다.
 */
export async function resolveVerification(
  token: string,
): Promise<VerificationResult> {
  if (!token) return { status: "invalid" };

  try {
    const response = await fetch(
      `${BASE_URL}/api/auth/verifications/${encodeURIComponent(token)}`,
      { cache: "no-store" },
    );

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      const email = typeof data?.email === "string" ? data.email : undefined;
      return { status: "valid", email };
    }

    if (response.status >= 500) {
      return { status: "error" };
    }

    return { status: "invalid" };
  } catch (error) {
    console.error("resolveVerification error:", error);
    return { status: "error" };
  }
}

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData,
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
    const res = await fetch(`${BASE_URL}/api/auth/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    // 로그인 실패는 사유를 구분하지 않는다. 미가입 / 소셜 전용 계정 / 비밀번호 불일치가
    // 모두 401 + 동일 본문으로 오며, 프론트가 사유를 추측하면 계정 열거가 가능해진다.
    if (!res.ok) {
      return { message: "아이디 또는 비밀번호가 일치하지 않습니다." };
    }

    await applySetCookieHeaders(res.headers.getSetCookie() ?? []);
  } catch (_e) {
    return { message: "서버 연결 중 오류가 발생했습니다." };
  }

  redirect("/");
}

export async function signupAction(
  _prevState: SignupFormState,
  formData: FormData,
): Promise<SignupFormState> {
  const rawData = {
    token: formData.get("token"),
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

  const { token, nickname, password } = validated.data;

  try {
    // apiClient 를 쓰면 201 과 함께 오는 Set-Cookie 2개가 버려져
    // 가입은 되었으나 로그인되지 않은 상태가 된다.
    const res = await fetch(`${BASE_URL}/api/auth/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, nickname, password }),
      cache: "no-store",
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
      return mapSignupError(res.status, body);
    }

    await applySetCookieHeaders(res.headers.getSetCookie() ?? []);
  } catch (error) {
    console.error("signupAction error:", error);
    return { message: TEMPORARY_ERROR_MESSAGE, outcome: "serverError" };
  }

  // redirect 는 NEXT_REDIRECT 를 throw 하므로 try 블록 밖에 두어야 한다.
  // try 안에서 호출하면 catch 가 삼켜 가입 성공이 실패로 표시된다.
  redirect("/");
}

export async function logoutAction(fcmToken?: string) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const refreshToken = cookieStore.get("refresh_token")?.value;

  try {
    if (accessToken && refreshToken) {
      await fetch(`${BASE_URL}/api/auth/tokens`, {
        method: "DELETE",
        headers: {
          Cookie: `access_token=${accessToken}; refresh_token=${refreshToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fcmToken }),
      });
    }
  } catch (e) {
    console.error("Backend logout failed", e);
  }

  cookieStore.delete("access_token");
  cookieStore.delete("refresh_token");

  redirect("/login");
}
