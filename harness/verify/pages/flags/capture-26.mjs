/**
 * Task 26 — Flag UI/UX 개선 Phase 2/3 캡처 스크립트
 *
 * Spring 백엔드 없이 동작: 미들웨어(proxy.ts)는 access_token 쿠키의 exp만 검사하므로
 * 서명 없는 페이크 JWT를 쿠키로 주입해 인증 리다이렉트를 우회한다.
 * 페이지는 API 실패 시 빈 배열로 fallback(flags/page.tsx 참고)하므로 UI 구조 검증은 가능.
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '../../');
const BASE = 'http://localhost:3000';

// 미들웨어가 검사하는 exp만 미래값으로 설정한 페이크 JWT
const fakeJwt = [
  Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
  Buffer.from(JSON.stringify({ sub: '4', exp: 9999999999 })).toString('base64url'),
  'fakesig',
].join('.');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });

  // 인증 쿠키 주입 (미들웨어 우회)
  await ctx.addCookies([
    { name: 'access_token', value: fakeJwt, domain: 'localhost', path: '/' },
  ]);
  const page = await ctx.newPage();

  // ─────────────────────────────────────────────
  // /flags 목록 페이지
  // ─────────────────────────────────────────────
  await page.goto(`${BASE}/flags`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);

  // 26-01: 초기 탭 확인 — "둘러보기" 활성
  await page.screenshot({ path: path.join(OUT, 'verify-26-01-tabs.png') });
  console.log('[26-01] verify-26-01-tabs.png');

  const browseTab      = page.locator('button').filter({ hasText: '둘러보기' });
  const hostingTab     = page.locator('button').filter({ hasText: '호스팅' });
  const participatingTab = page.locator('button').filter({ hasText: '참여 중' });

  console.log('  둘러보기 탭:', await browseTab.isVisible());
  console.log('  호스팅 탭:',   await hostingTab.isVisible());
  console.log('  참여 중 탭:',  await participatingTab.isVisible());

  // 구버전 탭명이 남아있지 않은지 확인
  const oldTab1 = page.locator('button').filter({ hasText: '주최 중' });
  const oldTab2 = page.locator('button').filter({ hasText: '친구 Flag' });
  console.log('  "주최 중" 잔존:', await oldTab1.isVisible().catch(() => false));
  console.log('  "친구 Flag" 잔존:', await oldTab2.isVisible().catch(() => false));

  // "종료 포함" 토글 존재 확인
  const closedToggle = page.locator('input[type="checkbox"]');
  console.log('  종료 포함 토글:', await closedToggle.isVisible());

  // 26-02: 호스팅 탭 클릭
  await hostingTab.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'verify-26-02-hosting-tab.png') });
  console.log('[26-02] verify-26-02-hosting-tab.png');

  // 26-03: 종료 포함 토글 ON
  await closedToggle.check();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, 'verify-26-03-closed-toggle-on.png') });
  console.log('[26-03] verify-26-03-closed-toggle-on.png');
  await closedToggle.uncheck();

  // 26-04: 참여 중 탭
  await participatingTab.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'verify-26-04-participating-tab.png') });
  console.log('[26-04] verify-26-04-participating-tab.png');

  // ─────────────────────────────────────────────
  // /flags/new 생성 폼
  // ─────────────────────────────────────────────
  await page.goto(`${BASE}/flags/new`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);

  // 26-05: 생성 폼 초기 상태
  await page.screenshot({ path: path.join(OUT, 'verify-26-05-new-form.png') });
  console.log('[26-05] verify-26-05-new-form.png');

  const cancelBtn = page.locator('button').filter({ hasText: '취소' });
  console.log('  [취소] 버튼 존재:', await cancelBtn.isVisible());

  const startInput = page.locator('input[type="datetime-local"]').first();
  const startVal = await startInput.inputValue();
  console.log('  시작 일시 기본값:', startVal === '' ? '(빈 값 OK)' : `"${startVal}" — 예상과 다름`);

  // "모집 마감" 레이블 (모집 마감일 → 모집 마감)
  const deadlineLabel = page.locator('label').filter({ hasText: /^모집 마감/ });
  const deadlineLabelText = await deadlineLabel.first().textContent().catch(() => '');
  console.log('  모집 마감 레이블:', deadlineLabelText.trim());

  // 26-06: 빈 폼 제출 → 유효성 에러 표시 (Phase 3: 빈값 방어)
  const submitBtn = page.locator('button').filter({ hasText: /Flag\s*만들기|만들기/ }).first();
  await submitBtn.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'verify-26-06-validation-error.png') });
  console.log('[26-06] verify-26-06-validation-error.png — 빈값 유효성 에러');

  const titleError = page.locator('text=제목을 입력해주세요');
  console.log('  제목 에러 표시:', await titleError.isVisible().catch(() => false));

  // 26-07: 취소 버튼 → /flags 이동
  await cancelBtn.click();
  await page.waitForURL(u => u.toString().endsWith('/flags'), { timeout: 5000 }).catch(() => {});
  const afterCancelUrl = page.url();
  console.log('  취소 후 URL:', afterCancelUrl);
  await page.screenshot({ path: path.join(OUT, 'verify-26-07-cancel-redirect.png') });
  console.log('[26-07] verify-26-07-cancel-redirect.png');

  // ─────────────────────────────────────────────
  // /flags/new?parentFlagId=1 — Encore 폼 (앙코르 표기 확인)
  // ─────────────────────────────────────────────
  await page.goto(`${BASE}/flags/new?parentFlagId=1`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'verify-26-08-encore-form.png') });
  console.log('[26-08] verify-26-08-encore-form.png — Encore 폼 (앙코르 버튼)');

  const encoreSubmitBtn = page.locator('button').filter({ hasText: 'Encore 생성' });
  console.log('  앙코르 생성 버튼:', await encoreSubmitBtn.isVisible());

  // ─────────────────────────────────────────────
  // /flags/{id} 상세 페이지
  // Spring 없이 접근 시 데이터가 없어 렌더 불가이므로
  // 직접 flagId를 지정하거나 존재하는 Flag가 없는 경우 스킵 안내
  // ─────────────────────────────────────────────
  await page.goto(`${BASE}/flags`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // 호스팅 탭에서 카드 존재 여부 확인
  const hostingTabBtn = page.locator('button').filter({ hasText: '호스팅' });
  await hostingTabBtn.click();
  await page.waitForTimeout(400);

  const flagCards = page.locator('button.w-full.text-left');
  const cardCount = await flagCards.count();

  if (cardCount > 0) {
    await flagCards.first().click();
    await page.waitForURL(u => u.toString().includes('/flags/'), { timeout: 6000 }).catch(() => {});

    if (page.url().includes('/flags/') && !page.url().includes('/flags/new')) {
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(800);

      // 26-09: 상세 페이지 — 레이아웃·정원·수정 버튼
      await page.screenshot({ path: path.join(OUT, 'verify-26-09-detail-top.png') });
      console.log('[26-09] verify-26-09-detail-top.png');

      const capacityText = page.locator('text=/참여자 \\d+명/');
      console.log('  정원 "참여자 N명" 표시:', await capacityText.isVisible().catch(() => false));

      // 26-10: 스크롤 하단 (메모리얼 + 댓글)
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(OUT, 'verify-26-10-detail-bottom.png') });
      console.log('[26-10] verify-26-10-detail-bottom.png');

      const memorialTitle = page.locator('text=메모리얼 남기기');
      console.log('  "메모리얼 남기기" 표시:', await memorialTitle.isVisible().catch(() => false));

      const lockOpenIcon = page.locator('button').filter({ hasText: '🔓' }).last();
      console.log('  🔓 기본 공개 아이콘:', await lockOpenIcon.isVisible().catch(() => false));

      // 26-11: 비공개 토글 클릭 → 🔒 전환
      if (await lockOpenIcon.isVisible().catch(() => false)) {
        await lockOpenIcon.click();
        await page.waitForTimeout(300);
        const lockClosedIcon = page.locator('button').filter({ hasText: '🔒' }).last();
        console.log('  🔒 비공개 전환:', await lockClosedIcon.isVisible().catch(() => false));
        await page.screenshot({ path: path.join(OUT, 'verify-26-11-comment-private.png') });
        console.log('[26-11] verify-26-11-comment-private.png');
      }
    }
  } else {
    console.log('  호스팅 Flag 없음 (백엔드 미실행) — 상세 페이지 캡처 스킵');
    console.log('  [참고] 상세 페이지 검증은 백엔드 실행 후 재확인 필요');
  }

  await browser.close();
  console.log('\n캡처 완료 →', OUT);
}

run().catch(err => {
  console.error(err.message);
  console.error(err.stack);
  process.exit(1);
});
