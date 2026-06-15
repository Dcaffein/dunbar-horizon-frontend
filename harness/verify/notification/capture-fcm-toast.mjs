// Task 34 Phase 2: FCM 포그라운드 토스트 검증
// traceRevealed 이벤트를 통해 실제 FCM 푸시 수신 후 인앱 토스트가 표시되는지 확인

import { chromium } from "playwright";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const BASE_FE = "http://localhost:3000";
const BASE_BE = "http://localhost:8080";
const EMAIL = "leesuhwan@test.com";
const PASSWORD = "String123!";
const OUT = "harness/verify/notification";

async function beLogin() {
  const res = await fetch(`${BASE_BE}/api/auth/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`백엔드 로그인 실패: ${res.status}`);

  const cookies = res.headers.getSetCookie?.() ?? [res.headers.get("set-cookie") ?? ""];
  const accessEntry = cookies.find((c) => c.startsWith("access_token="));
  if (!accessEntry) throw new Error("access_token 쿠키 없음");
  return accessEntry.split(";")[0].replace("access_token=", "");
}

async function main() {
  console.log("1. 백엔드 로그인...");
  const token = await beLogin();
  const authHeader = { Cookie: `access_token=${token}` };

  console.log("2. 내 프로필 조회 (leesuhwan ID)...");
  const meRes = await fetch(`${BASE_BE}/api/v1/users/me`, { headers: authHeader });
  const me = await meRes.json();
  const myId = me.id;
  if (!myId) throw new Error("내 ID를 가져올 수 없음");
  console.log(`   내 ID: ${myId}`);

  // lsh(ID:1)을 방문 대상으로 고정 (social profile 확인됨)
  const friendId = 1;
  console.log(`3. 방문 대상 고정: ID ${friendId} (lsh)`);

  console.log("4. 트레이스 시드 (내=2, 대상=3)...");
  const seedRes = await fetch(
    `${BASE_BE}/api/dev/traces/seed?countTwoUserId=${myId}&countThreeUserId=${friendId}`,
    { method: "POST", headers: authHeader }
  );
  console.log(`   시드 결과: ${seedRes.status}`);

  console.log("5. 브라우저 시작 (persistent context — Push API 지원)...");
  // Playwright 기본 context는 incognito로 처리돼 Push API가 차단됨
  // launchPersistentContext로 일반 프로필 사용
  const userDataDir = mkdtempSync(join(tmpdir(), "pw-fcm-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    permissions: ["notifications"],
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  // 콘솔 전체 캡처
  page.on("console", (msg) => console.log(`[browser:${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => console.log("[page error]", err.message));

  console.log("6. UI 로그인...");
  await page.goto(`${BASE_FE}/login`);
  await page.fill('input[name="email"], input[type="email"]', EMAIL);
  await page.fill('input[name="password"], input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_FE}/`, { timeout: 15000 });
  console.log("   로그인 완료");

  console.log("7. /notifications 진입 → 알람 토글 ON (FCM 토큰 등록)...");
  await page.goto(`${BASE_FE}/notifications`);
  await page.waitForTimeout(2000);

  const toggle = page.locator('button[role="switch"]');
  // 항상 OFF → ON 순서로 재등록 강제
  const isOn = (await toggle.getAttribute("aria-checked")) === "true";
  if (isOn) {
    await toggle.click(); // OFF
    await page.waitForTimeout(2000);
  }
  await toggle.click(); // ON
  await page.waitForTimeout(3000);

  const fcmToken = await page.evaluate(() => localStorage.getItem("fcmToken"));
  console.log(`   FCM 토큰: ${fcmToken ? fcmToken.slice(0, 30) + "..." : "❌ 없음 (등록 실패)"}`);
  const notifPerm = await page.evaluate(() => Notification.permission);
  console.log(`   Notification.permission: ${notifPerm}`);
  await page.screenshot({ path: `${OUT}/11-alarm-on-before-visit.png` });

  // 백엔드에서 토큰 등록 상태 확인
  if (fcmToken) {
    const statusRes = await fetch(
      `${BASE_BE}/api/v1/notifications/device-token/status?token=${encodeURIComponent(fcmToken)}`,
      { headers: authHeader }
    );
    const statusData = await statusRes.json();
    console.log(`   백엔드 토큰 등록 상태: ${statusRes.status} → ${JSON.stringify(statusData)}`);
  }

  // 알람 토글 ON 이후 트레이스 시드를 다시 실행 (FCM 토큰 등록 후 시드해야 정확)
  console.log("8. 트레이스 시드 재실행 (FCM 토큰 등록 이후)...");
  const seed2Res = await fetch(
    `${BASE_BE}/api/dev/traces/seed?countTwoUserId=${myId}&countThreeUserId=${friendId}`,
    { method: "POST", headers: authHeader }
  );
  console.log(`   시드 결과: ${seed2Res.status}`);

  console.log(`9. /users/${friendId} 방문 (trace 발화)...`);
  await page.goto(`${BASE_FE}/users/${friendId}`);
  await page.bringToFront();

  const visState = await page.evaluate(() => document.visibilityState);
  const swController = await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? 'none');
  console.log(`   visibilityState: ${visState}`);
  console.log(`   SW controller: ${swController}`);

  // traceRevealed 확인: revealed=true면 PublicProfile에 👀 배지 렌더됨
  await page.waitForTimeout(3000);
  const revealedBadge = await page.$('text=최근 서로 자주 방문');
  console.log(`   traceRevealed 발화: ${revealedBadge ? '✅ 확인 (👀 배지 렌더됨)' : '❌ 미확인 (배지 없음 — 카운트가 3-3 아님)'}`);
  await page.screenshot({ path: `${OUT}/11-after-visit.png` });

  console.log("10. FCM 토스트 대기 (최대 10초, 실제 FCM)...");
  let toastReceived = false;
  try {
    await page.waitForSelector(".fixed.top-4.right-4", { timeout: 10000 });
    toastReceived = true;
    await page.screenshot({ path: `${OUT}/12-foreground-toast-visible.png` });
    console.log("   ✅ 실제 FCM 토스트 표시 확인!");
    await page.waitForTimeout(5500);
    await page.screenshot({ path: `${OUT}/13-toast-auto-dismissed.png` });
    const toastGone = await page.$(".fixed.top-4.right-4");
    console.log(toastGone ? "   ⚠️ 토스트가 아직 있음" : "   ✅ 토스트 자동 닫힘 확인");
  } catch {
    console.log("   ⚠️ 실제 FCM 미수신 — 클라이언트 코드 시뮬레이션으로 검증");
  }

  if (!toastReceived) {
    console.log("10-b. __testFcmToast로 토스트 UI 직접 검증...");
    await page.evaluate(() => {
      const fn = window.__testFcmToast;
      if (typeof fn === "function") fn("Dunbar Horizon", "👀 최근 서로 자주 방문하고 있어요!");
    });
    await page.waitForTimeout(500);
    const toastEl = await page.$(".fixed.top-4.right-4");
    if (toastEl) {
      await page.screenshot({ path: `${OUT}/12-toast-visible.png` });
      console.log("   ✅ 토스트 표시 확인 — 클라이언트 코드 정상");
      await page.waitForTimeout(5500);
      await page.screenshot({ path: `${OUT}/13-toast-auto-dismissed.png` });
      const gone = await page.$(".fixed.top-4.right-4");
      console.log(gone ? "   ⚠️ 자동 닫힘 미작동" : "   ✅ 5초 자동 닫힘 확인");
    } else {
      await page.screenshot({ path: `${OUT}/12-toast-failed.png` });
      console.log("   ❌ 토스트 미표시 — 클라이언트 코드 문제");
    }
  }

  // X 버튼 수동 닫기 확인 (__testFcmToast 사용)
  console.log("11. X 버튼 수동 닫기 확인...");
  await page.waitForFunction(() => typeof window.__testFcmToast === "function", { timeout: 5000 });
  await page.evaluate(() => window.__testFcmToast("Dunbar Horizon", "X 버튼 닫기 테스트"));
  await page.waitForSelector(".fixed.top-4.right-4", { timeout: 3000 });
  await page.click('button[aria-label="닫기"]');
  await page.waitForTimeout(300);
  const toastGone = await page.$(".fixed.top-4.right-4");
  await page.screenshot({ path: `${OUT}/14-toast-manual-dismissed.png` });
  console.log(toastGone ? "   ❌ X 버튼으로 닫기 실패" : "   ✅ X 버튼 수동 닫기 확인");

  await context.close();
  console.log("\n검증 완료. harness/verify/notification/11~14 스크린샷 확인하세요.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
