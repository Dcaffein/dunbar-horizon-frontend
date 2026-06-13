import { chromium } from 'playwright';
const BASE = 'http://localhost:3000';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'lsh@test.com');
  await page.fill('input[type="password"]', 'String123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 10000 });
  await page.goto(`${BASE}/flags/51`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.locator('button').filter({ hasText: '초대하기' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'harness/verify/pages/flags-id/05-invite-modal.png', fullPage: true });
  await browser.close();
  console.log('done');
})();
