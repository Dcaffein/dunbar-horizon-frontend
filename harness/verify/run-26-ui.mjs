import { chromium } from 'playwright';

const OUT = 'harness/verify';
const BASE = 'http://localhost:3000';
const fakeJwt = [
  Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),
  Buffer.from(JSON.stringify({sub:'4',exp:9999999999})).toString('base64url'),
  'sig',
].join('.');

const br = await chromium.launch({ headless: true });
const ctx = await br.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addCookies([{ name:'access_token', value:fakeJwt, domain:'localhost', path:'/' }]);
const p = await ctx.newPage();

// ── 둘러보기 탭 (기본) ───────────────────────────────────
await p.goto(`${BASE}/test-flags`);
await p.waitForLoadState('networkidle');
await p.waitForTimeout(600);
await p.screenshot({ path: `${OUT}/ui-01-browse-tab.png` });
console.log('ui-01-browse-tab.png');

// ── 호스팅 탭 ────────────────────────────────────────────
await p.locator('button:has-text("호스팅")').click();
await p.waitForTimeout(400);
await p.screenshot({ path: `${OUT}/ui-02-hosting-tab.png` });
console.log('ui-02-hosting-tab.png');

// ── 호스팅 탭 — 종료 포함 토글 ON (CLOSED 카드 노출) ─────
await p.locator('input[type="checkbox"]').check();
await p.waitForTimeout(300);
await p.screenshot({ path: `${OUT}/ui-03-hosting-with-closed.png` });
console.log('ui-03-hosting-with-closed.png');

// 다시 OFF
await p.locator('input[type="checkbox"]').uncheck();
await p.waitForTimeout(200);

// ── 참여 중 탭 ───────────────────────────────────────────
await p.locator('button:has-text("참여 중")').click();
await p.waitForTimeout(400);
await p.screenshot({ path: `${OUT}/ui-04-participating-tab.png` });
console.log('ui-04-participating-tab.png');

// ── 둘러보기 — 종료 포함 ON (CLOSED 카드 포함) ───────────
await p.locator('button:has-text("둘러보기")').click();
await p.waitForTimeout(300);
await p.locator('input[type="checkbox"]').check();
await p.waitForTimeout(300);
await p.screenshot({ path: `${OUT}/ui-05-browse-with-closed.png` });
console.log('ui-05-browse-with-closed.png');

await br.close();
console.log('완료');
