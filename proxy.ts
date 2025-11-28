import { NextResponse } from "next/server";
import { BASE_URL } from "./lib/constants";
import type { NextRequest } from "next/server";

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );

    const payload = JSON.parse(jsonPayload);

    if (!payload || typeof payload.exp !== "number") {
      return true;
    }

    return payload.exp < Math.floor(Date.now() / 1000);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return true;
  }
}

async function refreshAccessToken(refreshToken: string) {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/auth/tokens`, {
      method: "POST",
      headers: {
        Cookie: `refreshToken=${refreshToken}`,
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

  //제외되는 경로
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

  const accessToken = request.cookies.get("accessToken")?.value;
  const refreshToken = request.cookies.get("refreshToken")?.value;

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
        if (cookieString.startsWith("accessToken=")) {
          const newValue = getCookieValue(cookieString, "accessToken");
          if (newValue) {
            nextResponse.cookies.set("accessToken", newValue, {
              httpOnly: true,
              secure: true,
              sameSite: "strict",
              path: "/",
            });
            // 기존 Cookie 헤더 값을 가져와서 교체
            const currentCookies = requestHeaders.get("Cookie") || "";
            // 기존 accessToken 제거 (덮어쓰기)
            const updatedCookies =
              currentCookies.replace(/accessToken=[^;]+;?/, "") +
              `; accessToken=${newValue}`;
            requestHeaders.set("Cookie", updatedCookies);
          }
        }

        if (cookieString.startsWith("refreshToken=")) {
          const newValue = getCookieValue(cookieString, "refreshToken");
          if (newValue) {
            nextResponse.cookies.set("refreshToken", newValue, {
              httpOnly: true,
              secure: true,
              sameSite: "strict",
              path: "/",
            });
            const currentCookies = requestHeaders.get("Cookie") || "";
            const updatedCookies =
              currentCookies.replace(/refreshToken=[^;]+;?/, "") +
              `; refreshToken=${newValue}`;
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
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
