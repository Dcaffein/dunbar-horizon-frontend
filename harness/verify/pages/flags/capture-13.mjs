import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = __dirname;
const BASE = 'http://localhost:3000';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();

  // ── 로그인 ────────────────────────────────────────────────
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', 'lsh@test.com');
  await page.fill('input[type="password"]', 'String123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 10000 });
  console.log('✅ 로그인 완료');

  // ── Flag 생성 → flagId 확보 ───────────────────────────────
  await page.goto(`${BASE}/flags/new`);
  await page.waitForLoadState('networkidle');

  // 필수 필드 입력
  await page.fill('input[placeholder="Flag 제목을 입력하세요"]', '[캡처용] 테스트 Flag');
  await page.fill('textarea[placeholder="Flag를 설명해주세요"]', '스크린샷 캡처를 위해 생성한 Flag입니다.');

  // 시작/종료 일시: 명시적 미래 날짜로 덮어쓰기 (datetime-local 입력)
  await page.fill('input[type="datetime-local"]:nth-of-type(1)', '2026-12-31T10:00');
  const dtInputs = page.locator('input[type="datetime-local"]');
  await dtInputs.nth(0).fill('2026-12-31T10:00');
  await dtInputs.nth(1).fill('2026-12-31T12:00');

  // 제출
  const submitBtn = page.locator('button').filter({ hasText: 'Flag 만들기' });
  await submitBtn.click();

  // 성공 시 /flags 목록으로 리다이렉트됨
  await page.waitForURL(u => u.toString().includes('/flags'), { timeout: 10000 });
  await page.waitForLoadState('networkidle');
  console.log(`현재 URL: ${page.url()}`);

  // 주최 중 탭에서 새로 만든 Flag 클릭 → /flags/{id} 진입
  const tabHosting = page.locator('button').filter({ hasText: '주최 중' });
  if (await tabHosting.isVisible({ timeout: 3000 }).catch(() => false)) {
    await tabHosting.click();
    await page.waitForTimeout(800);
  }

  const flagCards = page.locator('button.w-full.text-left');
  await flagCards.first().waitFor({ timeout: 8000 });
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 8000 }),
    flagCards.first().click(),
  ]);
  const flagId = page.url().match(/\/flags\/(\d+)/)?.[1];
  console.log(`✅ Flag 상세 진입, flagId=${flagId}, URL=${page.url()}`);

  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);

  // ── 13-01: 참가자 목록 섹션 캡처 ────────────────────────────
  // "참여자" 텍스트를 포함한 섹션으로 스크롤
  const participantsHeader = page.locator('text=/참여자/').first();
  if (await participantsHeader.isVisible({ timeout: 3000 }).catch(() => false)) {
    await participantsHeader.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
  }

  await page.screenshot({ path: path.join(OUT, '13-01-participants.png') });
  console.log('📸 13-01-participants.png');

  await browser.close();
  console.log('\n✅ 완료 →', OUT);
}

run().catch(err => {
  console.error('❌', err.message);
  console.error(err.stack);
  process.exit(1);
});
