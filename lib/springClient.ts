import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BASE_URL } from "./constants";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
}

async function fetchInternal<TResult, TBody = unknown>(
  endpoint: string,
  method: HttpMethod,
  body?: TBody,
  options: RequestOptions = {},
): Promise<TResult> {
  // set up request
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  let url = `${BASE_URL}${
    endpoint.startsWith("/") ? endpoint : `/${endpoint}`
  }`;

  if (options.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });
    url += `?${searchParams.toString()}`;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (accessToken) {
    headers["Cookie"] = `access_token=${accessToken}`;
  }

  //start to fetch
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: options.cache || "no-store",
      ...options,
    });

    //jwt Authorization 획득 실패
    if (response.status === 401) {
      console.warn(
        `[SpringClient] 401 Unauthorized at ${url}. Redirecting to login.`,
      );
      redirect("/login");
    }

    //그 외 에러
    //에러 메시지 json parsing 시도
    //json이 아닌 경우 바로 text화 해서 errorMessage 생성
    if (!response.ok) {
      let errorMessage = `API Error: ${response.status}`;

      try {
        const errorData = await response.json();
        if (
          errorData &&
          typeof errorData === "object" &&
          "message" in errorData
        ) {
          errorMessage = String(errorData.message);
        } else {
          errorMessage = JSON.stringify(errorData);
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        const errorText = await response.text();
        if (errorText) {
          errorMessage = errorText;
        }
      }
      throw new Error(errorMessage);
    }

    // fetch 성공, TResult로 반환
    const text = await response.text();
    return text ? (JSON.parse(text) as TResult) : ({} as TResult);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    console.error(`[SpringClient Error] ${method} ${endpoint}:`, error);
    throw error;
  }
}

export function isRedirectError(error: unknown): boolean {
  return (
    (typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      typeof (error as { digest: string }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")) ||
    (error instanceof Error && error.message === "NEXT_REDIRECT")
  );
}

export const springClient = {
  get: <TResult>(endpoint: string, options?: RequestOptions) =>
    fetchInternal<TResult, undefined>(endpoint, "GET", undefined, options),

  post: <TResult, TBody = undefined>(
    endpoint: string,
    body?: TBody,
    options?: RequestOptions,
  ) =>
    fetchInternal<TResult, TBody | undefined>(endpoint, "POST", body, options),

  put: <TResult, TBody = undefined>(
    endpoint: string,
    body?: TBody,
    options?: RequestOptions,
  ) =>
    fetchInternal<TResult, TBody | undefined>(endpoint, "PUT", body, options),

  delete: <TResult>(endpoint: string, options?: RequestOptions) =>
    fetchInternal<TResult, undefined>(endpoint, "DELETE", undefined, options),

  patch: <TResult, TBody = undefined>(
    endpoint: string,
    body?: TBody,
    options?: RequestOptions,
  ) =>
    fetchInternal<TResult, TBody | undefined>(endpoint, "PATCH", body, options),
};
