import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'http://localhost:3000';
const OUT = path.join(__dirname, 'pages', 'profile');

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

  await page.goto(`${BASE_URL}/profile`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);

  // ── 01: 초기 상태 (프로필 이미지·이메일·닉네임·편집 폼) ────────────────────
  await page.screenshot({ path: `${OUT}/01-initial.png`, fullPage: false });
  console.log('Saved 01-initial.png');

  // ── 02: 닉네임 1자 입력 → [저장] → 클라이언트 에러 ───────────────────────
  const nicknameInput = page.locator('input[placeholder="새 닉네임 입력"]');
  await nicknameInput.fill('A');
  await page.getByRole('button', { name: '저장' }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/02-nickname-short-error.png`, fullPage: false });
  console.log('Saved 02-nickname-short-error.png');

  // ── 03: 유효한 닉네임으로 저장 성공 → 성공 메시지 ─────────────────────────
  // 현재 닉네임을 읽어 그대로 저장 (변경 없음이지만 성공 메시지는 표시됨)
  const currentNickname = await page.locator('text=닉네임').locator('..').locator('p.text-sm').textContent();
  const saveNickname = (currentNickname?.trim() || '이수환');
  await nicknameInput.fill(saveNickname);
  await page.getByRole('button', { name: '저장' }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/03-nickname-saved.png`, fullPage: false });
  console.log('Saved 03-nickname-saved.png');

  await browser.close();
  console.log('Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
