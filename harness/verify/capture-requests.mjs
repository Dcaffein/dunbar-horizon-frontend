import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'http://localhost:3000';
const OUT = path.join(__dirname, 'pages', 'requests');

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

  await page.goto(`${BASE_URL}/requests`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);

  // ── 01: 받은 요청 탭 (기본 탭) ─────────────────────────────────────────────
  await page.screenshot({ path: `${OUT}/01-received.png`, fullPage: false });
  console.log('Saved 01-received.png');

  // ── 02: 보낸 요청 탭 ─────────────────────────────────────────────────────────
  await page.getByRole('button', { name: '보낸 요청' }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/02-sent.png`, fullPage: false });
  console.log('Saved 02-sent.png');

  // ── 03: 친구 찾기 탭 (검색 입력창·버튼) ────────────────────────────────────
  await page.getByRole('button', { name: '친구 찾기' }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/03-search.png`, fullPage: false });
  console.log('Saved 03-search.png');

  // ── 04: 존재하지 않는 이메일 검색 → 안내 메시지 ─────────────────────────────
  await page.fill('input[type="email"]', 'notexist@nowhere.com');
  await page.getByRole('button', { name: '검색' }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/04-not-found.png`, fullPage: false });
  console.log('Saved 04-not-found.png');

  await browser.close();
  console.log('Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
