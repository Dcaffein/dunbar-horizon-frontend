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

  // ═══════════════════════════════════════════════════════════
  // /flags 목록 — 3개 탭
  // ═══════════════════════════════════════════════════════════
  await page.goto(`${BASE}/flags`);
  await page.waitForLoadState('networkidle');

  // 탭 버튼들
  const tabHosting      = page.locator('button').filter({ hasText: '주최 중' });
  const tabParticipate  = page.locator('button').filter({ hasText: '참여 중' });
  const tabFriends      = page.locator('button').filter({ hasText: '친구 Flag' });

  // ── 11-01: 주최 중 탭 (초기 상태) ───────────────────────────
  await tabHosting.waitFor({ timeout: 8000 });
  await tabHosting.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, '11-01-hosting-tab.png') });
  console.log('📸 11-01-hosting-tab.png');

  // 주최 중 탭에서 flagId 하나 확보 (13-01용)
  let flagId = null;
  const flagCards = page.locator('button.w-full.text-left');
  const cardCount = await flagCards.count();
  if (cardCount > 0) {
    // 첫 번째 카드의 클릭 이벤트를 통해 URL 변화로 ID 파악
    const [navPromise] = await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 8000 }).catch(() => null),
      flagCards.first().click(),
    ]);
    if (page.url().includes('/flags/')) {
      flagId = page.url().split('/flags/')[1].split('?')[0].split('/')[0];
      console.log(`✅ flagId 확보: ${flagId}`);
      await page.goBack();
      await page.waitForLoadState('networkidle');
    }
  }
  console.log(`주최 중 Flag 카드 수: ${cardCount}`);

  // ── 11-02: 참여 중 탭 ───────────────────────────────────────
  await tabParticipate.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, '11-02-participating-tab.png') });
  console.log('📸 11-02-participating-tab.png');

  // ── 11-03: 친구 Flag 탭 ─────────────────────────────────────
  await tabFriends.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, '11-03-friends-tab.png') });
  console.log('📸 11-03-friends-tab.png');

  // ═══════════════════════════════════════════════════════════
  // /flags/new — 생성 폼
  // ═══════════════════════════════════════════════════════════
  await page.goto(`${BASE}/flags/new`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);

  // ── 11-04: 생성 폼 초기 상태 ────────────────────────────────
  await page.screenshot({ path: path.join(OUT, '11-04-new-flag-form.png') });
  console.log('📸 11-04-new-flag-form.png');

  // ── 11-05: 필수 필드 비워서 제출 → 에러 메시지 ──────────────
  const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /Flag\s*만들기|만들기|생성|제출/ }).first();
  await submitBtn.waitFor({ timeout: 5000 });
  await submitBtn.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, '11-05-validation-error.png') });
  console.log('📸 11-05-validation-error.png');

  // ═══════════════════════════════════════════════════════════
  // /flags/{id} — 참가자 목록 (Task 13-01)
  // ═══════════════════════════════════════════════════════════
  if (flagId) {
    await page.goto(`${BASE}/flags/${flagId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    // 참가자 섹션이 스크린에 보이도록 스크롤
    const participantsSection = page.locator('text=참여자').first();
    if (await participantsSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      await participantsSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
    }

    await page.screenshot({ path: path.join(OUT, '13-01-participants.png') });
    console.log('📸 13-01-participants.png');
  } else {
    console.log('⚠️ 주최 중 Flag 없음 — 13-01 스킵');
  }

  await browser.close();
  console.log('\n✅ 전체 캡처 완료 →', OUT);
}

run().catch(err => {
  console.error('❌', err.message);
  console.error(err.stack);
  process.exit(1);
});
