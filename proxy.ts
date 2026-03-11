//app.proxy.ts
import { NextResponse } from "next/server";
import { BASE_URL } from "./lib/constants";
import type { NextRequest } from "next/server";

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;

    const base64Url = parts[1];
    let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");

    while (base64.length % 4) {
      base64 += "=";
    }

    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join(""),
    );

    const payload = JSON.parse(jsonPayload);

    if (!payload || typeof payload.exp !== "number") {
      return true;
    }

    // 만료 시간 비교 (네트워크 지연을 고려해 10초 정도 텀을 둠)
    return payload.exp < Math.floor(Date.now() / 1000) + 10;
  } catch (e) {
    console.error("JWT Decode Error:", e);
    return true; // 파싱 실패 시 만료로 간주
  }
}

async function refreshAccessToken(refreshToken: string) {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/tokens`, {
      method: "PATCH",
      headers: {
        Cookie: `refresh_token=${refreshToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const setCookieHeaders = response.headers.getSetCookie();

    if (!setCookieHeaders || setCookieHeaders.length === 0) {
      return null;
    }

    return setCookieHeaders;
  } catch (error) {
    console.error("Refresh request failed:", error);
    return null;
  }
}

function getCookieValue(cookieString: string, key: string): string | undefined {
  const parts = cookieString.split(";");
  for (const part of parts) {
    const [name, value] = part.trim().split("=");
    if (name === key) return value;
  }
  return undefined;
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/verify-email") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.endsWith(".ico")
  ) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;

  if (accessToken && !isTokenExpired(accessToken)) {
    return NextResponse.next();
  }

  // refreshToken으로 재발급시도
  if (refreshToken) {
    console.log("Access Token 만료됨. 재발급 시도");
    const newCookieHeaders = await refreshAccessToken(refreshToken);

    if (newCookieHeaders) {
      const requestHeaders = new Headers(request.headers);
      const nextResponse = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

      newCookieHeaders.forEach((cookieString) => {
        if (cookieString.startsWith("access_token=")) {
          const newValue = getCookieValue(cookieString, "access_token");
          if (newValue) {
            nextResponse.cookies.set("access_token", newValue, {
              httpOnly: true,
              secure: true,
              sameSite: "strict",
              path: "/",
            });
            // 기존 Cookie 헤더 값을 가져와서 교체
            const currentCookies = requestHeaders.get("Cookie") || "";
            // 기존 accessToken 제거 (덮어쓰기)
            const updatedCookies =
              currentCookies.replace(/access_token=[^;]+;?/, "") +
              `; access_token=${newValue}`;
            requestHeaders.set("Cookie", updatedCookies);
          }
        }

        if (cookieString.startsWith("refresh_token=")) {
          const newValue = getCookieValue(cookieString, "refresh_token");
          if (newValue) {
            nextResponse.cookies.set("refresh_token", newValue, {
              httpOnly: true,
              secure: true,
              sameSite: "strict",
              path: "/",
            });
            const currentCookies = requestHeaders.get("Cookie") || "";
            const updatedCookies =
              currentCookies.replace(/refresh_token=[^;]+;?/, "") +
              `; refresh_token=${newValue}`;
            requestHeaders.set("Cookie", updatedCookies);
          }
        }
      });

      console.log("토큰 재발급 성공");
      return nextResponse;
    } else {
      console.log("토큰 재발급 실패");
    }
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", pathname);

  //  현재 요청이 브라우저 화면 이동인가? 아니면 백그라운드 데이터(API/액션) 통신인가?
  const isServerAction = request.headers.has("Next-Action");
  const isAjax = request.headers.get("accept")?.includes("application/json");

  if (isServerAction || isAjax) {
    // 백그라운드 통신 중 토큰이 죽었다면, 강제로 401 에러 throw
    const errorResponse = NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
    // 쓸모없어진 만료된 쿠키는 삭제
    errorResponse.cookies.delete("access_token");
    errorResponse.cookies.delete("refresh_token");
    return errorResponse;
  }

  // 일반적인 브라우저 화면 이동(URL 직접 입력, Link 태그 등)일 때는 정상적으로 리다이렉트
  const redirectResponse = NextResponse.redirect(loginUrl);
  redirectResponse.cookies.delete("access_token");
  redirectResponse.cookies.delete("refresh_token");
  return redirectResponse;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
