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
export type FailureKind = "http" | "network" | "timeout" | "parse" | "unknown";

/**
 * 백엔드가 정의한 에러 코드. 응답 본문의 `error` 자리에 온다.
 *
 * 예전에는 예외 클래스명(`FlagNotFoundException`)이 그대로 실려 나와,
 * 백엔드가 클래스를 리네임하면 계약이 조용히 깨졌다. 백엔드 task-100 에서
 * 소스에 명시한 상수로 교체했다.
 *
 * **분기하는 자리에서만 이 타입과 비교한다.** 아래 `ApiErrorBody.error` 를
 * 이 타입으로 선언하지 않는 이유는 그 값이 와이어에서 오기 때문이다 —
 * 백엔드가 코드를 추가하면 유니온이 사실과 어긋난다.
 */
export type ApiErrorCode =
  // 공통 — 스프링이 요청 처리 전에 던지는 것들
  | "INVALID_INPUT"
  | "INVALID_JSON_FORMAT"
  | "INVALID_REQUEST"
  | "INVALID_PARAMETER_TYPE"
  | "UNAUTHORIZED"
  | "ACCESS_DENIED"
  | "RESOURCE_NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "CONCURRENT_MODIFICATION"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "INTERNAL_SERVER_ERROR"
  // account
  | "ACCOUNT_ALREADY_ACTIVATED"
  | "ACCOUNT_ALREADY_REGISTERED_EMAIL"
  | "ACCOUNT_AUTH_NOT_FOUND"
  | "ACCOUNT_INVALID_CREDENTIALS"
  | "ACCOUNT_VERIFICATION_TOKEN_INVALID"
  | "ACCOUNT_REFRESH_TOKEN_NOT_FOUND"
  | "ACCOUNT_TOKEN_THEFT_DETECTED"
  | "ACCOUNT_USER_NOT_FOUND"
  | "AUTH_TOKEN_EXPIRED"
  | "AUTH_TOKEN_INVALID"
  // flag
  | "FLAG_ACCESS_DENIED"
  | "FLAG_DEADLINE_PASSED"
  | "FLAG_FULL_CAPACITY"
  | "FLAG_INVALID_BASIC_INFO"
  | "FLAG_INVALID_CAPACITY"
  | "FLAG_INVALID_STATUS"
  | "FLAG_NOT_FOUND"
  | "FLAG_PARTICIPANT_NOT_FOUND"
  | "FLAG_PARTICIPATION_DUPLICATE"
  | "FLAG_SCHEDULE_INVALID"
  | "FLAG_COMMENT_ACCESS_DENIED"
  | "FLAG_COMMENT_INVALID_CONTENT"
  | "FLAG_COMMENT_NOT_FOUND"
  | "FLAG_COMMENT_REPLY_DEPTH_EXCEEDED"
  | "FLAG_INVITATION_ACCESS_DENIED"
  | "FLAG_INVITATION_DUPLICATE"
  | "FLAG_INVITATION_INVALID"
  | "FLAG_INVITATION_NOT_FOUND"
  | "FLAG_MEMORIAL_ACCESS_DENIED"
  | "FLAG_MEMORIAL_INVALID_CONTENT"
  | "FLAG_MEMORIAL_NOT_FOUND"
  // social
  | "FRIEND_ALREADY_CONNECTED"
  | "FRIEND_REQUEST_TO_SELF"
  | "FRIEND_REQUEST_DUPLICATE"
  | "FRIEND_REQUEST_ACCESS_DENIED"
  | "FRIEND_REQUEST_INVALID"
  | "FRIEND_REQUEST_NOT_ACCEPTED"
  | "FRIEND_REQUEST_NOT_FOUND"
  | "FRIENDSHIP_ACCESS_DENIED"
  | "FRIENDSHIP_INVALID"
  | "FRIENDSHIP_INVALID_ALIAS"
  | "FRIENDSHIP_NOT_FOUND"
  | "LABEL_ACCESS_DENIED"
  | "LABEL_INVALID_NAME"
  | "LABEL_MEMBER_DUPLICATE"
  | "LABEL_MEMBER_NOT_FRIEND"
  | "LABEL_NAME_DUPLICATE"
  | "LABEL_NOT_FOUND"
  | "SOCIAL_USER_NOT_FOUND"
  // buzz · notification · trace
  | "BUZZ_ACCESS_DENIED"
  | "BUZZ_INVALID_STATE"
  | "BUZZ_NOT_FOUND"
  | "NOTIFICATION_ACCESS_DENIED"
  | "TRACE_SELF_VISIT";

/** 백엔드 @RestControllerAdvice 가 내려주는 에러 본문 형태. */
export interface ApiErrorBody {
  /**
   * 에러 코드. 값은 `ApiErrorCode` 중 하나지만 와이어에서 오므로 `string` 으로 둔다.
   * 좁히는 것은 비교하는 자리에서 한다.
   */
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
// 404 본문도 신뢰하지 않는다. 실측 결과 백엔드의 404 문구는 사용자용이 아니라
// 내부 식별자를 담고 있다 — "존재하지 않는 flagMemorial : 99999999",
// "User(4)와 User(99999999) 사이의...", "요청하신 경로를 찾을 수 없습니다: api/v1/...".
// 라우팅 미스와 도메인 예외가 같은 404 를 쓰므로 호출부 단위로는 가릴 수 없다.
const NOT_FOUND_ERROR = "요청하신 대상을 찾을 수 없습니다.";

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
  /**
   * 서버 본문의 `error` — 백엔드가 정의한 코드(`ApiErrorCode`)다.
   * 응답에 `code` 라는 필드가 따로 있는 것이 아니다. 이름이 `code` 인 것은
   * `kind`·`status`·`detail` 과 나란히 놓이는 자리라서다.
   *
   * 주 용도는 로그다. 분기는 `mapSignupError` 한 곳뿐이며, 늘릴 때는
   * 문자열이 아니라 `ApiErrorCode` 와 비교할 것.
   */
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

      // 서버 문구를 그대로 쓸 수 있는 것은 사용자용으로 쓰인 4xx 뿐이다.
      // 5xx 는 처리되지 않은 예외 문자열일 수 있고, 404 는 내부 식별자를 담는다.
      const message =
        response.status >= 500
          ? SERVER_ERROR
          : response.status === 404
            ? NOT_FOUND_ERROR
            : errorBody.message ?? CLIENT_ERROR;

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

/**
 * Server Action 이 화면으로 넘기는 실패 정보.
 *
 * `ApiError` 는 클래스라 RSC 경계를 넘지 못한다. 직렬화 가능한 평범한 객체로 옮긴다.
 * `message` 는 `ApiError` 의 불변식을 그대로 물려받아 **화면에 띄워도 되는 문장**이다.
 */
export interface Failure {
  kind: FailureKind;
  /** kind === "http" 일 때만 존재한다. 없다고 네트워크 실패인 것은 아니다 — kind 로 판단할 것. */
  status?: number;
  message: string;
}

/** 조회 실패를 화면이 읽을 수 있는 형태로 바꾼다. `isRedirectError` 는 호출 전에 걸러야 한다. */
export function toFailure(error: unknown): Failure {
  if (error instanceof ApiError) {
    return { kind: error.kind, status: error.status, message: error.message };
  }
  // apiClient 를 거쳤다면 여기 오지 않는다. 액션 자체 코드가 던진 경우다.
  return { kind: "unknown", message: SERVER_ERROR };
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
