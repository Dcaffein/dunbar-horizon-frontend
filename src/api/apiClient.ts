import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BASE_URL } from "../lib/constants";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  silent?: boolean;
}

/**
 * 실패가 흐름의 어느 지점에서 났는지. 문자열을 보고 추측하지 않고
 * 발생 위치로 결정하므로 판정이 확정적이다.
 */
export type FailureKind = "http" | "network" | "timeout" | "parse";

/** 백엔드 @RestControllerAdvice 가 내려주는 에러 본문 형태. */
export interface ApiErrorBody {
  /** 내부 예외 클래스명. 로그·진단 전용 — 렌더링도 분기도 하지 않는다. */
  error?: string;
  /** 표시용 한국어 문장. */
  message?: string;
  /** 필드별 입력 안내. */
  validation?: Record<string, string>;
}

// 서버가 문구를 주지 못하거나 믿을 수 없을 때 프론트가 소유하는 문구.
const SERVER_ERROR = "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
const NETWORK_ERROR = "네트워크 연결을 확인해 주세요.";
const TIMEOUT_ERROR = "요청 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.";
const CLIENT_ERROR = "요청을 처리할 수 없습니다.";

interface ApiErrorInit {
  kind: FailureKind;
  status?: number;
  code?: string;
  validation?: Record<string, string>;
  detail?: unknown;
}

/**
 * 성공이 아닌 모든 경로가 이 타입 하나로 나온다.
 *
 * 불변식: `message` 는 언제나 사용자에게 그대로 보여도 되는 문장이다.
 * 서버가 계약대로 준 문장이거나, 아니면 위 고정 문구다.
 * 원본 문자열(`fetch failed` 등)은 `detail` 에만 담기며 화면에 노출하지 않는다.
 *
 * `Error` 를 상속하고 `message` 를 같은 자리에 채우므로
 * 기존 `error instanceof Error ? error.message : "..."` 호출부가 그대로 동작한다.
 */
export class ApiError extends Error {
  readonly kind: FailureKind;
  readonly status?: number;
  readonly code?: string;
  readonly validation?: Record<string, string>;
  readonly detail?: unknown;

  constructor(message: string, init: ApiErrorInit) {
    super(message);
    this.name = "ApiError";
    this.kind = init.kind;
    this.status = init.status;
    this.code = init.code;
    this.validation = init.validation;
    this.detail = init.detail;
  }
}

/** 응답을 받기도 전에 실패한 경우. 서버가 준 문구가 존재할 수 없다. */
function classifyTransportError(error: unknown): ApiError {
  const name = (error as { name?: string } | null)?.name;
  const causeCode = (error as { cause?: { code?: string } } | null)?.cause?.code ?? "";
  const isTimeout =
    name === "TimeoutError" || name === "AbortError" || /TIMEOUT/i.test(causeCode);

  return isTimeout
    ? new ApiError(TIMEOUT_ERROR, { kind: "timeout", detail: error })
    : new ApiError(NETWORK_ERROR, { kind: "network", detail: error });
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
    // 본문은 한 번만 읽는다. json() 이 실패한 뒤 text() 를 다시 부르면
    // 본문이 이미 소비되어 그 호출도 실패한다.
    if (!response.ok) {
      const raw = await response.text();
      let errorBody: ApiErrorBody = {};

      try {
        errorBody = raw ? (JSON.parse(raw) as ApiErrorBody) : {};
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        // JSON 이 아닌 응답(게이트웨이 HTML 등). 본문은 detail 로만 남긴다.
      }

      // 5xx 본문은 신뢰하지 않는다. 처리되지 않은 예외의 문자열일 수 있다.
      const message =
        response.status >= 500 ? SERVER_ERROR : errorBody.message ?? CLIENT_ERROR;

      throw new ApiError(message, {
        kind: "http",
        status: response.status,
        code: errorBody.error,
        validation: errorBody.validation,
        detail: raw,
      });
    }

    // fetch 성공, TResult로 반환
    const text = await response.text();
    if (!text) return {} as TResult;

    try {
      return JSON.parse(text) as TResult;
    } catch (e) {
      // 2xx 인데 본문이 JSON 이 아니다. SyntaxError 를 그대로 올리면
      // 영문 파서 메시지가 화면에 뜬다.
      throw new ApiError(SERVER_ERROR, {
        kind: "parse",
        status: response.status,
        detail: e,
      });
    }
  } catch (error) {
    // redirect() 가 던지는 NEXT_REDIRECT 를 감싸면 전역 리다이렉트가 죽는다.
    if (isRedirectError(error)) {
      throw error;
    }

    const failure =
      error instanceof ApiError ? error : classifyTransportError(error);

    if (!options.silent) {
      const where =
        failure.kind +
        (failure.status ? ` ${failure.status}` : "") +
        (failure.code ? ` ${failure.code}` : "");
      console.error(
        `[apiClient] ${method} ${endpoint} → ${where}`,
        failure.detail ?? failure.message,
      );
    }
    throw failure;
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

export const apiClient = {
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

  delete: <TResult, TBody = undefined>(
    endpoint: string,
    body?: TBody,
    options?: RequestOptions,
  ) =>
    fetchInternal<TResult, TBody | undefined>(endpoint, "DELETE", body, options),

  patch: <TResult, TBody = undefined>(
    endpoint: string,
    body?: TBody,
    options?: RequestOptions,
  ) =>
    fetchInternal<TResult, TBody | undefined>(endpoint, "PATCH", body, options),
};

export const customFetch = async <T>(
  url: string,
  options: RequestInit = {},
): Promise<T> => {
  // Orval이 넘겨준 method 추출 (없으면 기본값 GET)
  const method = (options.method || "GET") as HttpMethod;

  //  Orval은 body를 JSON.stringify 해서 주지만,
  // 기존 fetchInternal은 내부에서 다시 stringify를 하므로 객체로 원복
  let parsedBody = undefined;
  if (options.body && typeof options.body === "string") {
    try {
      parsedBody = JSON.parse(options.body);
    } catch (e) {
      parsedBody = options.body; // JSON이 아닌 일반 텍스트인 경우
    }
  }

  return fetchInternal<T, unknown>(url, method, parsedBody, {
    headers: options.headers as Record<string, string>,
    cache: options.cache,
    credentials: options.credentials,
  });
};
