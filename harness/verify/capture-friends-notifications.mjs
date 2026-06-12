import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'http://localhost:3000';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', 'lsh@test.com');
  await page.fill('input[type="password"]', 'String123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 10000 });
  console.log('Logged in');

  // ════════════════════════════════════════════════════════════
  // /friends/{friendId}
  // ════════════════════════════════════════════════════════════
  const friendsDir = path.join(__dirname, 'pages', 'friends-id');

  // ── 01: 별칭 있는 친구 프로필 (위정현 id=7, alias="별칭테스트") ──────────────
  await page.goto(`${BASE_URL}/friends/7`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${friendsDir}/01-profile.png`, fullPage: false });
  console.log('Saved friends-id/01-profile.png');

  // ── 02: direct:true → "직접 연결된 친구입니다." (최두현 id=2) ────────────────
  await page.goto(`${BASE_URL}/friends/2`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${friendsDir}/02-direct-connection.png`, fullPage: false });
  console.log('Saved friends-id/02-direct-connection.png');

  // ── 03: direct:false 스킵 (테스트 데이터에서 lsh의 모든 친구가 direct:true) ──
  console.log('Skipped friends-id/03-intermediary.png (all friends are direct)');

  // ── 04: 프로필 이미지 없는 친구 → letter avatar (이우주 id=41) ───────────────
  await page.goto(`${BASE_URL}/friends/41`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${friendsDir}/04-letter-avatar.png`, fullPage: false });
  console.log('Saved friends-id/04-letter-avatar.png');

  // ── 05: revealed:true 스킵 (모든 trace가 revealed:false) ──────────────────────
  console.log('Skipped friends-id/05-trace-revealed.png (no revealed traces in test data)');

  // ════════════════════════════════════════════════════════════
  // /notifications
  // ════════════════════════════════════════════════════════════
  const notifsDir = path.join(__dirname, 'pages', 'notifications');

  // ── 01: 알림 목록 (FRIEND_REQUEST_ACCEPT 2건) ─────────────────────────────────
  await page.goto(`${BASE_URL}/notifications`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${notifsDir}/01-list.png`, fullPage: false });
  console.log('Saved notifications/01-list.png');

  // ── 02·03: FLAG_INVITATION 스킵 (lsh에게 해당 알림 없음) ─────────────────────
  console.log('Skipped notifications/02-flag-invitation.png (no FLAG_INVITATION)');
  console.log('Skipped notifications/03-after-reject.png (no FLAG_INVITATION)');

  await browser.close();
  console.log('Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
