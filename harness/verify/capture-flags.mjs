import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'http://localhost:3000';
const PAGES_DIR = path.join(__dirname, 'pages');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Login
  console.log('Logging in...');
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"], input[name="email"]', 'lsh@test.com');
  await page.fill('input[type="password"], input[name="password"]', 'String123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 10000 });
  console.log('Logged in. Current URL:', page.url());

  // ── /flags ──────────────────────────────────────────────────────────────────
  const flagsDir = path.join(PAGES_DIR, 'flags');
  await page.goto(`${BASE_URL}/flags`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // 01 — 주최 중 탭
  const hostingTab = page.getByRole('tab', { name: /주최 중/ }).or(page.getByText('주최 중')).first();
  if (await hostingTab.isVisible()) await hostingTab.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(flagsDir, '01-hosting.png'), fullPage: false });
  console.log('Saved flags/01-hosting.png');

  // flagId 수집: Encore 버튼의 parentFlagId 쿼리 파라미터에서 추출
  let flagId = null;
  const allFlagLinks = await page.locator('a[href*="/flags/"]').all();
  for (const link of allFlagLinks) {
    const href = await link.getAttribute('href');
    // /flags/{id} 직접 경로
    const directMatch = href?.match(/^\/flags\/(\d+)$/);
    if (directMatch) { flagId = directMatch[1]; break; }
    // /flags/new?parentFlagId={id} 형태
    const encoreMatch = href?.match(/parentFlagId=(\d+)/);
    if (encoreMatch) { flagId = encoreMatch[1]; break; }
  }
  console.log('Found flagId:', flagId);

  // 02 — 참여 중 탭
  const participatingTab = page.getByRole('tab', { name: /참여 중/ }).or(page.getByText('참여 중')).first();
  if (await participatingTab.isVisible()) await participatingTab.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(flagsDir, '02-participating.png'), fullPage: false });
  console.log('Saved flags/02-participating.png');

  // 03 — 친구 Flag 탭
  const friendsTab = page.getByRole('tab', { name: /친구/ }).or(page.getByText(/친구 Flag/)).first();
  if (await friendsTab.isVisible()) await friendsTab.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(flagsDir, '03-friends.png'), fullPage: false });
  console.log('Saved flags/03-friends.png');

  // ── /flags/{id} ─────────────────────────────────────────────────────────────
  if (flagId) {
    const flagIdDir = path.join(PAGES_DIR, 'flags-id');
    await page.goto(`${BASE_URL}/flags/${flagId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 01 — Flag 상세 (제목·설명·일정·host 정보)
    await page.screenshot({ path: path.join(flagIdDir, '01-detail.png'), fullPage: false });
    console.log('Saved flags-id/01-detail.png');

    // 02 — 참가자 목록 섹션 (스크롤 다운)
    await page.evaluate(() => window.scrollBy(0, 400));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(flagIdDir, '02-participants.png'), fullPage: false });
    console.log('Saved flags-id/02-participants.png');

    // 03 — 초대 섹션 (host 본인이므로 표시 예상)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(flagIdDir, '03-invite-section.png'), fullPage: false });
    console.log('Saved flags-id/03-invite-section.png');
  } else {
    console.warn('No flagId found — skipping /flags/{id} captures');
  }

  // ── /flags/new ──────────────────────────────────────────────────────────────
  const flagsNewDir = path.join(PAGES_DIR, 'flags-new');
  await page.goto(`${BASE_URL}/flags/new`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // 01 — 폼 초기 상태
  await page.screenshot({ path: path.join(flagsNewDir, '01-form.png'), fullPage: true });
  console.log('Saved flags-new/01-form.png');

  // 02 — 필수 필드 비워서 제출 → 에러
  const submitBtn = page.getByRole('button', { name: /만들기|생성|저장|Flag 만들기|submit/i }).first();
  if (await submitBtn.isVisible()) {
    await submitBtn.click();
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: path.join(flagsNewDir, '02-validation-error.png'), fullPage: true });
  console.log('Saved flags-new/02-validation-error.png');

  await browser.close();
  console.log('Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
